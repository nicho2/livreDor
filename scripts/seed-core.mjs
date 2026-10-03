// Operator-only test tooling. Never imported by the application or exposed as a route.
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { guestbookEntrySchema, memorySchema } from "../src/lib/validators.ts";
import { validateMediaFile } from "../src/lib/media.ts";

export const datasetUrl = new URL("../fixtures/seed-v1/dataset.json", import.meta.url);
const assetRoot = new URL("../fixtures/seed-v1/assets/", import.meta.url);
const mimeTypes = { "cafe.png": "image/png", "sortie.png": "image/png", "animation.mp4": "video/mp4", "signal.wav": "audio/wav" };
export class SeedError extends Error {}

export function validateTarget(origin, slug) {
  const url = new URL(origin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
      (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
    throw new SeedError("URL attendue : origine HTTPS, ou HTTP localhost, sans chemin ni identifiants.");
  }
  if (!/^test-[a-z0-9][a-z0-9-]{0,74}$/.test(slug)) throw new SeedError("Le lien du projet doit commencer par test- (80 caractères maximum).");
  return url.origin;
}

export function stableId(projectId, key) {
  const hex = createHash("sha256").update(`livredor:seed-v1:${projectId}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function validateDataset(data) {
  if (data.version !== "seed-v1" || data.actors.length !== 4 || data.memories.length !== 8) throw new Error("Jeu de test invalide.");
  const actors = new Set();
  for (const actor of data.actors) {
    if (!/^[a-z]+$/.test(actor.key) || actors.has(actor.key) || !actor.displayName.startsWith("TEST — ") || !actor.message.startsWith("[TEST SYNTHÉTIQUE")) throw new Error("Auteur fictif invalide.");
    actors.add(actor.key);
    guestbookEntrySchema.parse(actor);
    if (!["draft", "published"].includes(actor.status)) throw new Error("Statut de message invalide.");
  }
  const memories = new Set();
  for (const memory of data.memories) {
    if (!/^[a-z]+$/.test(memory.key) || memories.has(memory.key) || !actors.has(memory.actor) || !memory.title.startsWith("TEST — ") || !memory.body.startsWith("[TEST SYNTHÉTIQUE")) throw new Error("Souvenir fictif invalide.");
    memories.add(memory.key);
    memorySchema.parse({ ...memory, displayName: "TEST", occurredOn: memory.occurredOn ?? "" });
    if (!["draft", "published", "hidden"].includes(memory.status) || memory.media.some((name) => !mimeTypes[name])) throw new Error("Média ou statut invalide.");
  }
  return data;
}

export async function loadDataset() {
  return validateDataset(JSON.parse(await readFile(datasetUrl, "utf8")));
}

export async function loadAssets(data) {
  const assets = new Map();
  for (const name of new Set(data.memories.flatMap((m) => m.media))) {
    const url = new URL(name, assetRoot);
    const info = await stat(url);
    const mimeType = mimeTypes[name];
    if (!info.isFile() || !validateMediaFile(name, mimeType, info.size).ok) throw new Error(`Fichier de test invalide : ${name}.`);
    assets.set(name, { name, path: fileURLToPath(url), mimeType, sizeBytes: info.size });
  }
  return assets;
}

export function assertSeedProject(snapshot, slug, data, expectedId, now = Date.now()) {
  const p = snapshot.project;
  if (!p || p.id !== expectedId || p.slug !== slug || !/^TEST\b/i.test(p.title)) throw new SeedError("Le projet cible doit porter un titre commençant par TEST et correspondre à la configuration Supabase.");
  if (p.status !== "open" || (p.opens_at && Date.parse(p.opens_at) > now) || (p.closes_at && Date.parse(p.closes_at) <= now)) throw new SeedError("Le projet de test doit être ouvert aux contributions.");
  const entries = new Set(data.actors.map((a) => stableId(p.id, `entry:${a.key}`)));
  const memories = new Set(data.memories.map((m) => stableId(p.id, `memory:${m.key}`)));
  if (snapshot.entries.some((e) => !entries.has(e.id)) || snapshot.memories.some((m) => !memories.has(m.id))) throw new SeedError("Projet non vide : utilisez un projet TEST dédié, sans contributions manuelles.");
  if (snapshot.media?.some((m) => !memories.has(m.memory_id))) throw new SeedError("Médias étrangers au jeu de test : utilisez un projet TEST dédié.");
}

// No raw response bodies/errors: they may contain emails, signed URLs or tokens.
export async function httpJson(fetcher, url, token, method = "GET", body) {
  const response = await fetcher(url, {
    method, redirect: "error", signal: AbortSignal.timeout(60000),
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new SeedError(`API de test refusée (HTTP ${response.status}).`);
  return response.json();
}

// The adapter writes with contributor sessions (RLS), never the service role.
// Stable IDs plus insert-if-absent preserve moderation changes on subsequent runs.
export async function seedDataset({ data, snapshot, slug, projectId, assets, backend, log = console.log }) {
  assertSeedProject(snapshot, slug, data, projectId);
  let entries = 0, memories = 0, media = 0;
  for (const actor of data.actors) {
    const author = await backend.author(actor, projectId);
    await backend.join(author, projectId);
    const entry = { id: stableId(projectId, `entry:${actor.key}`), project_id: projectId, author_id: author.id,
      display_name: actor.displayName, message: actor.message, formatting: actor.formatting, status: actor.status };
    await backend.insertOnly(author, "guestbook_entries", entry);
    entries++;
    for (const memory of data.memories.filter((m) => m.actor === actor.key)) {
      const row = { id: stableId(projectId, `memory:${memory.key}`), project_id: projectId, author_id: author.id,
        display_name: actor.displayName, title: memory.title, body: memory.body, status: memory.status,
        occurred_on: memory.occurredOn, year_from: memory.yearFrom, year_to: memory.yearTo };
      await backend.insertOnly(author, "memories", row);
      memories++;
      for (const name of memory.media) {
        await backend.upload(author, projectId, row.id, assets.get(name));
        media++;
      }
    }
    log(`${actor.displayName} : données présentes.`);
  }
  return { entries, memories, media };
}
