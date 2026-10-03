// Runs the real compiled Next API against a LOCAL Auth/PostgREST fixture and REAL R2.
// Never creates a Supabase account or changes the user's projects/contributions.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { S3Client, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
const ids = { project: randomUUID(), a: randomUUID(), b: randomUUID(), organizer: randomUUID(), memory: randomUUID(), otherMemory: randomUUID() };
const timestamp = new Date().toISOString();
const tables = {
  projects: [{ id: ids.project, slug: "integration-test", title: "TEST V1", subject_name: "Test", description: "Fixture locale", status: "open", opens_at: null, closes_at: null, created_by: ids.organizer, created_at: timestamp }],
  project_members: [ids.a, ids.b, ids.organizer].map((user_id) => ({ project_id: ids.project, user_id, role: user_id === ids.organizer ? "organizer" : "contributor" })),
  memories: [{ id: ids.memory, project_id: ids.project, author_id: ids.a, display_name: "TEST A", title: "TEST publié", body: "Un souvenir publié", status: "published", occurred_on: null, year_from: 2000, year_to: null, created_at: timestamp },
    { id: ids.otherMemory, project_id: ids.project, author_id: ids.b, display_name: "TEST B", title: "SECRET BROUILLON", body: "SECRET BROUILLON", status: "draft", occurred_on: null, year_from: null, year_to: null, created_at: timestamp }],
  guestbook_entries: [{ id: randomUUID(), project_id: ids.project, author_id: ids.a, display_name: "TEST A", message: "Bonjour <script>evil()</script>", formatting: { font: "serif", size: "md", align: "center", color: "blue", bold: true, italic: false }, status: "published", created_at: timestamp }],
  media_assets: [],
};
const tokens = { "test-a": ids.a, "test-b": ids.b, "test-organizer": ids.organizer };
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; console.log(`OK ${assertions} — ${message}`); };

const fixture = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const token = request.headers.authorization?.replace(/^Bearer /, "");
    response.setHeader("Content-Type", "application/json");
    if (url.pathname === "/auth/v1/user") {
      const id = tokens[token];
      response.statusCode = id ? 200 : 401;
      response.end(JSON.stringify(id ? { id, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: timestamp } : { message: "invalid token" }));
      return;
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (!tables[table]) { response.statusCode = 404; response.end("{}"); return; }
    const matches = (row) => [...url.searchParams].every(([key, value]) => {
      if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
      if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
      return true;
    });
    let selected = tables[table].filter(matches);
    // Only this fixture emulates public/owner reads. Real RLS is tested separately in PostgreSQL.
    if (token !== "test-service" && table === "media_assets") selected = selected.filter((m) => m.owner_id === tokens[token] ||
      (m.status === "published" && tables.memories.some((memory) => memory.id === m.memory_id && memory.status === "published")));
    if (["POST", "PATCH"].includes(request.method)) {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (request.method === "POST") {
        const row = { created_at: timestamp, ...body }; tables[table].push(row); selected = [row]; response.statusCode = 201;
      } else { selected.forEach((row) => Object.assign(row, body)); }
    }
    response.setHeader("Content-Range", `0-${Math.max(0, selected.length - 1)}/${selected.length}`);
    if (request.method === "HEAD") { response.end(); return; }
    response.end(JSON.stringify(request.headers.accept?.includes("vnd.pgrst.object") ? selected[0] ?? null : selected));
  } catch { response.statusCode = 500; response.end('{"message":"fixture error"}'); }
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const fixturePort = fixture.address().port;
const portProbe = createServer(); await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const appPort = portProbe.address().port; await new Promise((resolve) => portProbe.close(resolve));
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon", SUPABASE_SERVICE_ROLE_KEY: "test-service" },
});
child.stdout.on("data", () => {}); child.stderr.on("data", () => {});
const base = `http://127.0.0.1:${appPort}`;
const bucket = process.env.R2_BUCKET_NAME;
const storage = new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
async function call(path, { token = "test-a", method = "GET", body } = {}) {
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) };
  return fetch(`${base}${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
}
function unzip(buffer) {
  const files = new Map(); let eocd = buffer.length - 22;
  while (eocd >= 0 && buffer.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  assert.ok(eocd >= 0, "Valid ZIP directory");
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < buffer.readUInt16LE(eocd + 10); i++) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
    const method = buffer.readUInt16LE(offset + 10), size = buffer.readUInt32LE(offset + 20);
    const nameSize = buffer.readUInt16LE(offset + 28), extra = buffer.readUInt16LE(offset + 30), comment = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameSize).toString();
    const local = buffer.readUInt32LE(offset + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const bytes = buffer.subarray(start, start + size);
    files.set(name, method === 8 ? inflateRawSync(bytes) : bytes);
    offset += 46 + nameSize + extra + comment;
  }
  return files;
}
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await call("/api/media/presign", { method: "POST", token: null })).status === 401) break; }
    catch { /* wait for production server */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (i === 59) throw new Error("Test server failed to start");
  }
  const input = { projectId: ids.project, memoryId: ids.memory, filename: "test-pixel.png", mimeType: "image/png", sizeBytes: 68 };
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6p8AAAAASUVORK5CYII=", "base64");
  input.sizeBytes = bytes.length;
  check((await call("/api/media/presign", { method: "POST", token: null, body: input })).status === 401, "authentification obligatoire");
  check((await call("/api/media/presign", { method: "POST", token: "invalid", body: input })).status === 401, "jeton invalide refusé");
  const otherAuthor = await call("/api/media/presign", { method: "POST", token: "test-b", body: input });
  check(otherAuthor.status === 403, `souvenir d'un autre auteur refusé (${otherAuthor.status})`);
  check((await call("/api/media/presign", { method: "POST", body: { ...input, filename: "evil.html" } })).status === 400, "extension incohérente refusée");
  check((await call("/api/media/presign", { method: "POST", body: { ...input, sizeBytes: 16 * 1024 * 1024 } })).status === 400, "taille excessive refusée");
  const presign = await call("/api/media/presign", { method: "POST", body: input }); check(presign.status === 200, "réservation média créée");
  const { uploadUrl, mediaId } = await presign.json();
  check((await call(`/api/media/${mediaId}`, { token: null })).status === 404, "upload non finalisé invisible");
  const preflight = await fetch(uploadUrl, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
  check(preflight.status === 204 && preflight.headers.get("access-control-allow-origin") === "http://localhost:3000", "CORS PUT accepté");
  check((await fetch(uploadUrl, { method: "PUT", body: bytes, headers: { "Content-Type": input.mimeType } })).ok, "PUT signé réel sur R2");
  check((await call(`/api/media/${mediaId}`, { method: "POST", token: "test-b" })).status === 403, "finalisation par autre auteur refusée");
  const finalized = await call(`/api/media/${mediaId}`, { method: "POST" });
  check(finalized.status === 200, `finalisation vérifiée : ${finalized.status}`);
  const read = await call(`/api/media/${mediaId}`, { token: null }); check(read.status === 200, "GET public autorisé pour parent publié");
  const { url } = await read.json(); check(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(bytes), "lecture signée : octets identiques");
  check((await fetch(uploadUrl, { method: "PUT", body: Buffer.alloc(bytes.length), headers: { "Content-Type": input.mimeType } })).ok, "PUT réutilisé cible seulement le temporaire");
  check(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(bytes), "objet final inchangé après réutilisation du PUT");
  tables.memories[0].status = "draft";
  check((await call(`/api/media/${mediaId}`, { token: null })).status === 404, "parent brouillon rend le média privé");
  check((await call(`/api/media/${mediaId}`)).status === 200, "auteur conserve son aperçu privé");
  tables.memories[0].status = "published";
  const adminPath = `/api/projects/${ids.project}/admin`, exportPath = `/api/projects/${ids.project}/export`;
  check((await call(adminPath)).status === 403, "administration interdite au contributeur");
  check((await call(exportPath, { method: "POST" })).status === 403, "export interdit au contributeur");
  check((await call(exportPath, { token: "test-organizer", method: "POST" })).status === 409, "export final exige clôture");
  const closed = await call(adminPath, { token: "test-organizer", method: "PATCH", body: { action: "project", status: "closed", opensAt: null, closesAt: null } });
  check(closed.status === 200 && tables.projects[0].status === "closed", "organisateur peut clôturer");
  check((await call("/api/media/presign", { method: "POST", body: input })).status === 403, "upload après clôture refusé");
  check((await call(`/api/media/${mediaId}`, { method: "DELETE" })).status === 403, "suppression contributeur après clôture refusée");
  const exported = await call(exportPath, { token: "test-organizer", method: "POST" }); check(exported.status === 200, "export ZIP après clôture");
  const files = unzip(Buffer.from(await exported.arrayBuffer()));
  const html = files.get("site/index.html").toString();
  check(files.has("README.txt") && files.has("site/assets/app.css"), "site et instructions présents");
  check(!html.includes("SECRET BROUILLON") && !html.includes("<script>") && html.includes("&lt;script&gt;"), "site publié : brouillons exclus et HTML échappé");
  check(files.get("archive-privee/data/memories.json").toString().includes("SECRET BROUILLON"), "sauvegarde privée conserve le brouillon");
  const mediaPath = [...files.keys()].find((key) => key.startsWith("site/media/"));
  check(files.get(mediaPath).equals(bytes) && html.includes(mediaPath.slice(5)), "média autonome copié dans le ZIP");
  check(![...files.values()].filter((b) => b.length !== bytes.length).some((b) => b.toString().includes("cloudflarestorage.com")), "aucune URL signée dans l'archive");
  check((await call(adminPath, { token: "test-organizer", method: "PATCH", body: { action: "moderate", table: "memories", contentId: ids.memory, status: "hidden" } })).status === 200, "modération autorisée après clôture");
  const deleted = await call(`/api/media/${mediaId}`, { token: "test-organizer", method: "DELETE" }); check(deleted.status === 200, "suppression organisateur après clôture");
  const row = tables.media_assets.find((m) => m.id === mediaId);
  let missing = false; try { await storage.send(new HeadObjectCommand({ Bucket: bucket, Key: row.object_key })); } catch (error) { missing = error.name === "NotFound"; }
  check(missing && row.status === "hidden", "suppression logique et physique vérifiée");
  // Deliberately forged metadata can never yield a signed read URL.
  tables.memories[0].status = "published";
  row.status = "published"; row.object_key = "another-project/private-secret.png";
  check((await call(`/api/media/${mediaId}`)).status === 409, "clé objet forgée refusée avant accès stockage");
  console.log(`PASS : ${assertions} contrôles ; Auth/données fictives locales, R2 réel.`);
} finally {
  // Delete only keys derived from this run's UUIDs, never enumerating user objects.
  for (const row of tables.media_assets) {
    const staging = `${ids.project}/${row.owner_id}/uploads/${row.id}`;
    const final = `${ids.project}/${row.owner_id}/${row.id}-test-pixel.png`;
    await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: staging }));
    await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: final }));
  }
  child.kill(); await new Promise((resolve) => fixture.close(resolve));
}
