import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { loadDataset, loadAssets, validateTarget, assertSeedProject, stableId, seedDataset, httpJson } from "../scripts/seed-core.mjs";
import { makeClients, createBackend, organizerLogin } from "../scripts/seed-backend.mjs";

const projectId = "11111111-1111-4111-a111-111111111111";
const slug = "test-recette";
const empty = () => ({ project: { id: projectId, slug, title: "TEST — Recette", status: "open" }, entries: [], memories: [] });
const data = await loadDataset();
const assets = await loadAssets(data);

test("jeu synthétique : contenu valide, états et cas de chronologie", () => {
  assert.equal(data.actors.length, 4);
  assert.equal(data.memories.length, 8);
  assert.equal(data.memories.filter((m) => m.status === "published").length, 5);
  assert.equal(data.memories.filter((m) => m.status === "draft").length, 2);
  assert.equal(data.memories.filter((m) => m.status === "hidden").length, 1);
  assert.ok(data.memories.some((m) => m.occurredOn));
  assert.ok(data.memories.some((m) => m.yearFrom && m.yearTo));
  assert.ok(data.memories.some((m) => m.yearFrom && !m.yearTo));
  assert.ok(data.memories.some((m) => !m.occurredOn && !m.yearFrom));
  assert.equal(data.memories.flatMap((m) => m.media).length, 5);
});

test("médias embarqués réels : signatures PNG, MP4 et WAV", async () => {
  assert.equal(assets.size, 4);
  for (const name of ["cafe.png", "sortie.png"]) {
    const bytes = await readFile(assets.get(name).path);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(bytes.readUInt32BE(16) >= 640);
  }
  assert.equal((await readFile(assets.get("animation.mp4").path)).subarray(4, 8).toString(), "ftyp");
  const audio = await readFile(assets.get("signal.wav").path);
  assert.equal(audio.subarray(0, 4).toString(), "RIFF");
  assert.equal(audio.subarray(8, 12).toString(), "WAVE");
});

test("cibles : HTTPS obligatoire hors localhost, pas d'identifiants/chemin/projet réel", () => {
  assert.equal(validateTarget("https://recette.example", slug), "https://recette.example");
  assert.equal(validateTarget("http://localhost:3000", slug), "http://localhost:3000");
  for (const url of ["http://recette.example", "https://u:secret@recette.example", "https://recette.example/auth", "https://recette.example/?token=secret", "file:///tmp/"]) assert.throws(() => validateTarget(url, slug));
  assert.throws(() => validateTarget("https://recette.example", "depart-demo"));
  assert.throws(() => validateTarget("https://recette.example", "test-../escape"));
});

test("garde-fous : bonne instance, titre TEST, fenêtre ouverte et projet dédié", () => {
  assert.doesNotThrow(() => assertSeedProject(empty(), slug, data, projectId));
  for (const patch of [{ id: randomUUID() }, { slug: "test-autre" }, { title: "Retraite réelle" }, { status: "closed" }, { opens_at: "2199-01-01T00:00:00Z" }, { closes_at: "2000-01-01T00:00:00Z" }]) {
    const snapshot = empty(); Object.assign(snapshot.project, patch);
    assert.throws(() => assertSeedProject(snapshot, slug, data, projectId));
  }
  const snapshot = empty(); snapshot.memories.push({ id: randomUUID() });
  assert.throws(() => assertSeedProject(snapshot, slug, data, projectId));
  const same = empty(); same.memories.push({ id: stableId(projectId, "memory:cafe") });
  assert.doesNotThrow(() => assertSeedProject(same, slug, data, projectId));
  assert.notEqual(stableId(projectId, "memory:cafe"), stableId(randomUUID(), "memory:cafe"));
});

test("aperçu CLI réellement hors ligne, sans clé ni modification", () => {
  const child = spawnSync(process.execPath, ["scripts/seed-project.mjs", "--url", "https://hors-ligne.invalid", "--slug", slug], {
    cwd: new URL("../", import.meta.url), encoding: "utf8", timeout: 10000,
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", SUPABASE_SERVICE_ROLE_KEY: "" },
  });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /APERÇU HORS LIGNE/);
});

test("Apply sans confirmation : refus avant l'accès au backend", () => {
  const child = spawnSync(process.execPath, ["scripts/seed-project.mjs", "--url", "https://hors-ligne.invalid", "--slug", slug, "--apply"], {
    cwd: new URL("../", import.meta.url), encoding: "utf8", timeout: 10000,
    env: { ...process.env, SUPABASE_SERVICE_ROLE_KEY: "SECRET-MUST-NOT-LEAK" },
  });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /Confirmation/);
  assert.equal((child.stdout + child.stderr).includes("SECRET-MUST-NOT-LEAK"), false);
});

test("API privée : refus explicite, aucun secret du corps ni suivi de redirection", async () => {
  await assert.rejects(httpJson(async (_url, options) => {
    assert.equal(options.redirect, "error");
    return new Response('{"error":"SECRET"}', { status: 403 });
  }, "https://recette.example/api", "token"), /HTTP 403/);
});

test("connexion de l'opérateur : OTP existant, pas de création implicite", async () => {
  const answers = ["organisateur@example.test", "123456"];
  const client = { auth: {
    signInWithOtp: async (params) => { assert.equal(params.options.shouldCreateUser, false); return { data: {}, error: null }; },
    verifyOtp: async (params) => { assert.equal(params.type, "email"); return { data: { session: { access_token: "operator-token" } }, error: null }; },
  } };
  assert.equal(await organizerLogin(client, async () => answers.shift()), "operator-token");
});

function fixture() {
  const users = [], tables = { guestbook_entries: [], memories: [], media_assets: [] }, requests = [];
  const controls = { presignFail: false };
  const journal = { retired: new Set(), async retire(id) { this.retired.add(id); } };
  const response = (body) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  const fetcher = async (input, init = {}) => {
    const url = new URL(input), headers = new Headers(init.headers), method = init.method ?? "GET";
    const token = headers.get("authorization")?.replace("Bearer ", "");
    const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : null;
    requests.push({ url: url.pathname, method, token });
    assert.equal(init.redirect, "error");
    if (url.pathname === "/auth/v1/admin/users") return response({ users });
    if (url.pathname === "/auth/v1/admin/generate_link") {
      let user = users.find((u) => u.email === body.email);
      if (!user) { user = { id: randomUUID(), email: body.email, user_metadata: body.data, aud: "authenticated" }; users.push(user); }
      assert.ok(user.email.endsWith("@seed.example.invalid"));
      return response({ ...user, hashed_token: user.id, verification_type: "magiclink", action_link: "SECRET-LINK" });
    }
    if (url.pathname === "/auth/v1/verify") {
      const user = users.find((u) => u.id === body.token_hash);
      assert.equal(body.type, "email");
      return response({ user, access_token: `seed-${user.id}`, refresh_token: "PRIVATE", expires_in: 3600, token_type: "bearer" });
    }
    if (url.pathname === "/rest/v1/rpc/join_project") { assert.ok(token.startsWith("seed-")); return response(null); }
    if (url.pathname.startsWith("/rest/v1/")) {
      const table = url.pathname.split("/").pop();
      assert.notEqual(token, "service-secret", "La clé service ne doit pas écrire les contributions");
      let selected = tables[table].filter((row) => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3)));
      if (method === "POST") { tables[table].push(body); selected = [body]; }
      return response(headers.get("accept")?.includes("vnd.pgrst.object") ? selected[0] : selected);
    }
    if (url.pathname === "/api/media/presign") {
      if (controls.presignFail) return new Response("{}", { status: 503 });
      const media = { id: randomUUID(), project_id: body.projectId, memory_id: body.memoryId, owner_id: token.slice(5), original_filename: body.filename, status: "draft" };
      tables.media_assets.push(media);
      return response({ mediaId: media.id, uploadUrl: "https://test-account.r2.cloudflarestorage.com/fixture?signature=SECRET" });
    }
    if (url.hostname.endsWith(".r2.cloudflarestorage.com")) {
      assert.equal(method, "PUT");
      assert.equal(headers.get("authorization"), null, "Aucune clé/session Supabase transmise à R2");
      assert.ok(Buffer.isBuffer(init.body));
      return new Response(null, { status: 200 });
    }
    if (url.pathname.startsWith("/api/media/")) {
      const media = tables.media_assets.find((m) => m.id === url.pathname.split("/").pop());
      media.status = method === "DELETE" ? "hidden" : "published";
      return response({ ok: true });
    }
    throw new Error("Unexpected fixture route");
  };
  const clients = makeClients({ NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key", SUPABASE_SERVICE_ROLE_KEY: "service-secret" }, fetcher);
  return { users, tables, requests, controls, journal, backend: createBackend(clients, "https://recette.example", fetcher, journal) };
}

test("alimentation et reprise : quatre sessions, RLS, cinq uploads finalisés, aucun doublon", async () => {
  const f = fixture();
  const options = { data, snapshot: empty(), slug, projectId, assets, backend: f.backend, log: () => {} };
  assert.deepEqual(await seedDataset(options), { entries: 4, memories: 8, media: 5 });
  assert.equal(f.users.length, 4);
  assert.equal(f.tables.media_assets.filter((m) => m.status === "published").length, 5);
  assert.equal(f.requests.filter((r) => r.method === "PUT").length, 5);
  f.tables.memories[0].status = "hidden";
  f.tables.guestbook_entries[0].message = "[TEST SYNTHÉTIQUE] Correction organisateur";
  f.tables.media_assets[0].status = "hidden";
  // JSONB may reorder marker properties: recovering the same identities must work.
  for (const user of f.users) { const m = user.user_metadata.livredor_seed; user.user_metadata.livredor_seed = { actor: m.actor, project_id: m.project_id, version: m.version }; }
  options.snapshot = { ...empty(), entries: f.tables.guestbook_entries, memories: f.tables.memories };
  await seedDataset(options);
  assert.equal(f.users.length, 4);
  assert.equal(f.tables.guestbook_entries.length, 4);
  assert.equal(f.tables.memories.length, 8);
  assert.equal(f.tables.media_assets.length, 5);
  assert.equal(f.requests.filter((r) => r.method === "PUT").length, 5);
  assert.equal(f.tables.memories[0].status, "hidden");
  assert.match(f.tables.guestbook_entries[0].message, /Correction/);
  assert.equal(f.requests.some((r) => r.url === "/auth/v1/otp"), false, "Aucun mail fictif");
});

test("arrêt avant toute écriture sur un projet réel/non vide", async () => {
  const snapshot = empty(); snapshot.entries.push({ id: randomUUID() });
  await assert.rejects(seedDataset({ data, snapshot, slug, projectId, assets, backend: new Proxy({}, { get: () => { assert.fail("No backend call expected"); } }) }), /non vide/);
});

test("collision de compte synthétique : aucun lien/session créé pour un tiers", async () => {
  const f = fixture();
  f.users.push({ email: `livredor-${stableId(projectId, "actor:alice")}@seed.example.invalid`, user_metadata: {} });
  await assert.rejects(f.backend.author(data.actors[0], projectId), /Collision/);
  assert.equal(f.requests.some((r) => r.url === "/auth/v1/admin/generate_link"), false);
});

test("réservation inachevée : suppression limitée au média fictif puis nouvel upload", async () => {
  const f = fixture(), author = await f.backend.author(data.actors[0], projectId);
  const memoryId = stableId(projectId, "memory:cafe");
  f.tables.media_assets.push({ id: randomUUID(), project_id: projectId, memory_id: memoryId, owner_id: author.id, original_filename: "cafe.png", status: "draft" });
  await f.backend.upload(author, projectId, memoryId, assets.get("cafe.png"));
  assert.equal(f.tables.media_assets[0].status, "hidden");
  assert.equal(f.tables.media_assets[1].status, "published");
});

test("reprise après suppression d'une réservation puis panne : le journal permet de ré-uploader", async () => {
  const f = fixture(), author = await f.backend.author(data.actors[0], projectId);
  const memoryId = stableId(projectId, "memory:cafe"), id = randomUUID();
  f.tables.media_assets.push({ id, project_id: projectId, memory_id: memoryId, owner_id: author.id, original_filename: "cafe.png", status: "draft" });
  f.controls.presignFail = true;
  await assert.rejects(f.backend.upload(author, projectId, memoryId, assets.get("cafe.png")), /HTTP 503/);
  assert.equal(f.tables.media_assets[0].status, "hidden");
  assert.ok(f.journal.retired.has(id));
  f.controls.presignFail = false;
  await f.backend.upload(author, projectId, memoryId, assets.get("cafe.png"));
  assert.equal(f.tables.media_assets[1].status, "published");
});
