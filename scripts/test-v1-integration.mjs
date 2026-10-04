// Runs the real compiled Next API against a LOCAL Auth/PostgREST fixture and REAL R2.
// Never creates a Supabase account or changes the user's projects/contributions.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { S3Client, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
const ids = { project: randomUUID(), a: randomUUID(), b: randomUUID(), organizer: randomUUID(), memory: randomUUID(), otherMemory: randomUUID() };
const timestamp = new Date().toISOString();
const extraCleanupKeys = [];
const tables = {
  projects: [{ id: ids.project, slug: "integration-test", title: "TEST V1", subject_name: "Test", description: "Fixture locale", status: "open", opens_at: null, closes_at: null, created_by: ids.organizer, created_at: timestamp }],
  project_members: [ids.a, ids.b, ids.organizer].map((user_id) => ({ project_id: ids.project, user_id, role: user_id === ids.organizer ? "organizer" : "contributor" })),
  memories: [{ id: ids.memory, project_id: ids.project, author_id: ids.a, display_name: "TEST A", title: "TEST publié", body: "Un souvenir publié", status: "published", occurred_on: null, year_from: 2000, year_to: null, created_at: timestamp },
    { id: ids.otherMemory, project_id: ids.project, author_id: ids.b, display_name: "TEST B", title: "SECRET BROUILLON", body: "SECRET BROUILLON", status: "draft", occurred_on: null, year_from: null, year_to: null, created_at: timestamp }],
  guestbook_entries: [{ id: randomUUID(), project_id: ids.project, author_id: ids.a, display_name: "TEST A", message: "Bonjour <script>evil()</script>", formatting: { font: "serif", size: "md", align: "center", color: "blue", bold: true, italic: false }, status: "published", created_at: timestamp }],
  media_assets: [],
  project_organizer_invites: [],
};
const tokens = { "test-a": ids.a, "test-b": ids.b, "test-organizer": ids.organizer };
const emails = { "test-a": "a@example.test", "test-b": "b@example.test", "test-organizer": "organizer@example.test" };
let creationUnavailable = false;
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
      response.end(JSON.stringify(id ? { id, email: emails[token], email_confirmed_at: timestamp, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: timestamp } : { message: "invalid token" }));
      return;
    }
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString());
      const rpc = url.pathname.split("/").pop(), user = tokens[token];
      const fail = (code) => { response.statusCode = 400; response.end(JSON.stringify({ code, message: "Fixture refusal" })); };
      if (!user && token !== "test-service") { fail("42501"); return; }
      if (["confirm_project_export", "begin_project_deletion", "finish_project_deletion"].includes(rpc)) {
        if (token !== "test-service") { fail("42501"); return; }
        const p = tables.projects.find(project => project.id === body.p_project_id);
        if (rpc === "confirm_project_export") {
          const valid = p && ["closed", "archived"].includes(p.status) && !p.deletion_started_at && (p.content_revision ?? 0) === body.p_revision;
          if (valid) p.archive_exported_at = timestamp;
          response.end(JSON.stringify(!!valid)); return;
        }
        const organizer = tables.project_members.some(m => m.project_id === p?.id && m.user_id === body.p_actor && m.role === "organizer");
        if (!organizer || p.status !== "archived" || !p.archive_exported_at) { fail("23514"); return; }
        if (rpc === "begin_project_deletion") {
          if (p.slug !== body.p_slug) { fail("23514"); return; }
          p.deletion_started_at ??= timestamp; response.end(JSON.stringify(p)); return;
        }
        tables.projects = tables.projects.filter(project => project.id !== p.id);
        for (const name of ["project_members", "guestbook_entries", "memories", "media_assets", "project_organizer_invites"]) tables[name] = tables[name].filter(row => row.project_id !== p.id);
        response.end("true"); return;
      }
      if (rpc === "create_project_limited") {
        if (token !== "test-service") { fail("42501"); return; }
        if (creationUnavailable) { fail("PGRST202"); return; }
        if (tables.projects.some((p) => p.slug === body.p_slug)) { fail("23505"); return; }
        if (tables.projects.length >= body.p_limit) { response.statusCode = 400; response.end(JSON.stringify({ code: "P0001", message: "PROJECT_LIMIT_REACHED" })); return; }
        const project = { id: randomUUID(), slug: body.p_slug, title: body.p_title, subject_name: body.p_subject_name, description: body.p_description, event_date: body.p_event_date, status: "open", created_by: body.p_actor, opens_at: null, closes_at: null, created_at: timestamp };
        tables.projects.push(project); tables.project_members.push({ project_id: project.id, user_id: body.p_actor, role: "organizer" });
        response.end(JSON.stringify([project])); return;
      }
      const invitation = tables.project_organizer_invites.find((i) => i.project_id === body.p_project_id);
      const organizers = tables.project_members.filter((m) => m.project_id === body.p_project_id && m.role === "organizer");
      if (rpc === "accept_project_organizer_invite") {
        if (!invitation || invitation.email !== emails[token]) { response.end("false"); return; }
        if (!invitation.accepted_by) {
          if (organizers.length >= 2) { fail("23514"); return; }
          const member = tables.project_members.find((m) => m.project_id === body.p_project_id && m.user_id === user);
          if (member) member.role = "organizer"; else tables.project_members.push({ project_id: body.p_project_id, user_id: user, role: "organizer" });
          invitation.accepted_by = user;
        }
        response.end("true"); return;
      }
      if (!organizers.some((m) => m.user_id === user)) { fail("42501"); return; }
      if (rpc === "invite_project_organizer") {
        if (organizers.length >= 2 || body.p_email === emails[token]) { fail("23514"); return; }
        const next = { project_id: body.p_project_id, email: body.p_email, accepted_by: null };
        if (invitation) Object.assign(invitation, next); else tables.project_organizer_invites.push(next);
      } else if (rpc === "cancel_project_organizer_invite") {
        if (invitation?.accepted_by) { fail("23514"); return; }
        tables.project_organizer_invites = tables.project_organizer_invites.filter((i) => i.project_id !== body.p_project_id);
      } else { fail("PGRST202"); return; }
      response.end("null"); return;
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (!tables[table]) { response.statusCode = 404; response.end("{}"); return; }
    const matches = (row) => [...url.searchParams].every(([key, value]) => {
      if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
      if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
      return true;
    });
    let selected = tables[table].filter(matches);
    // Minimal session/read emulation. Real RLS is tested separately in PostgreSQL.
    if (token !== "test-service" && !tokens[token]) selected = [];
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
const sitesRuntime = process.argv.includes("--sites");
const htmlOnly = process.argv.includes("--html-only");
const child = spawn(process.execPath, sitesRuntime ? ["scripts/test-sites-server.mjs", String(appPort)] : ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(appPort)], {
  windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, LIVREDOR_SITE_MANAGERS: "a@example.test", LIVREDOR_MAX_PROJECTS: "3", SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${fixturePort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon", SUPABASE_SERVICE_ROLE_KEY: "test-service" },
});
child.stdout.on("data", () => {}); child.stderr.on("data", () => {});
const base = `http://127.0.0.1:${appPort}`;
const bucket = process.env.R2_BUCKET_NAME;
const storage = htmlOnly ? null : new S3Client({ region: "auto", endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
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
async function runChecks() {
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await call("/api/media/presign", { method: "POST", token: null })).status === 401) break; }
    catch { /* wait for production server */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (i === 59) throw new Error("Test server failed to start");
  }
  const input = { projectId: ids.project, memoryId: ids.memory, filename: "test-pixel.png", mimeType: "image/png", sizeBytes: 68 };
  // API-only checks miss SSR module imports. Exercise HTML routes before any
  // writes, using the same isolated fixture on Next.js and on Workers.
  for (const path of ["/", "/auth", "/all", "/nouveau", "/p/integration-test", "/p/integration-test/guestbook", "/p/integration-test/wall", "/p/integration-test/timeline", `/p/integration-test/memories/${ids.memory}`]) {
    const response = await call(path, { token: null });
    check(response.status === 200 && response.headers.get("content-type")?.includes("text/html"), `rendu HTML ${path} disponible`);
    const html = await response.text();
    check(html.includes("LivreDor") && !html.includes("No such module"), `rendu HTML ${path} contient l'application sans erreur de module`);
    check(!["TEST V1", "Fixture locale", "TEST publié", "Un souvenir publié", "SECRET BROUILLON", "evil()"].some((secret) => html.includes(secret)), `aucune donnée projet dans HTML/RSC anonyme ${path}`);
  }
  if (htmlOnly) {
    console.log(`PASS : ${assertions} contrôles HTML ; fixture locale, aucun accès R2/Supabase distant.`);
    return;
  }
  const newDetails = { title: "TEST Nouveau LivreDor", subjectName: "TEST Marie Martin", description: "Présentation de test", eventDate: "2026-10-03", slug: `test-${randomUUID()}` };
  check((await call("/api/projects", { method: "POST", token: null, body: newDetails })).status === 401, "création sans session refusée");
  check((await call("/api/projects", { method: "POST", body: { ...newDetails, created_by: ids.b } })).status === 400, "créateur forgé refusé");
  check((await call("/api/projects", { method: "POST", body: { ...newDetails, p_limit: 9999 } })).status === 400, "limite fournie par client refusée");
  check((await call("/api/projects", { method: "POST", body: { ...newDetails, eventDate: "2026-02-30" } })).status === 400, "création avec date invalide refusée");
  creationUnavailable = true;
  check((await call("/api/projects", { method: "POST", body: newDetails })).status === 503, "migration absente signalée explicitement");
  creationUnavailable = false;
  const created = await call("/api/projects", { method: "POST", body: newDetails });
  check(created.status === 201, "création authentifiée réussie");
  const createdProject = await created.json();
  check((await call("/api/projects", { method: "POST", body: { ...newDetails, slug: `test-${randomUUID()}` } })).status === 201, "troisième projet global autorisé");
  const quotaBlocked = await call("/api/projects", { method: "POST", body: { ...newDetails, slug: `test-${randomUUID()}` } });
  check(quotaBlocked.status === 409 && (await quotaBlocked.json()).error.includes("capacité"), "quatrième projet refusé avec message explicite");
  check(tables.projects.length === 3, "refus sans création partielle");
  const newAdmin = `/api/projects/${createdProject.id}/admin`;
  check(tables.project_members.some((m) => m.project_id === createdProject.id && m.user_id === ids.a && m.role === "organizer"), "créateur devient organisateur de son nouveau projet");
  check((await call("/api/projects", { method: "POST", token: "test-b", body: newDetails })).status === 403, "compte connecté non gestionnaire ne peut créer aucun projet");
  check((await call("/api/site-manager", { token: "test-b" })).status === 200 && !(await (await call("/api/site-manager", { token: "test-b" })).json()).manager, "droits gestionnaire non attribués au contributeur");
  check((await call(newAdmin, { token: "test-b" })).status === 403, "nouveau projet non administrable par un autre compte");
  const change = { action: "details", title: "TEST titre modifié", subjectName: "TEST Jean Dupont", description: "Présentation modifiée", eventDate: "" };
  check((await call(newAdmin, { token: "test-b", method: "PATCH", body: { action: "theme", theme: "wedding" } })).status === 403, "thème réservé à l'organisateur");
  check((await call(newAdmin, { method: "PATCH", body: { action: "theme", theme: "custom" } })).status === 400, "skin arbitraire refusé");
  check((await call(newAdmin, { method: "PATCH", body: { action: "theme", theme: "wedding" } })).status === 200, "thème partagé enregistré par l'organisateur");
  check((await call(newAdmin, { token: "test-b", method: "PATCH", body: change })).status === 403, "modification des informations refusée à un tiers");
  check((await call(newAdmin, { method: "PATCH", body: { ...change, slug: "new-link" } })).status === 400, "changement du lien par API refusé");
  check((await call(newAdmin, { method: "PATCH", body: change })).status === 200, "informations modifiables par leur organisateur");
  const loaded = await (await call(newAdmin)).json();
  check(loaded.project.subject_name === change.subjectName && loaded.project.event_date === null && loaded.project.slug === newDetails.slug, "informations persistantes et date facultative effacée");
  const invite = { action: "invite-organizer", email: " B@example.test " };
  check((await call(newAdmin, { token: "test-b", method: "PATCH", body: invite })).status === 403, "invitation par tiers refusée");
  check((await call(newAdmin, { method: "PATCH", body: { ...invite, email: "invalide" } })).status === 400, "email d'invitation invalide refusé");
  check((await call(newAdmin, { method: "PATCH", body: invite })).status === 200, "invitation du deuxième organisateur enregistrée");
  check((await call(newAdmin, { token: "test-organizer" })).status === 403, "organisateur d'un autre projet ne peut accepter");
  check((await call(newAdmin, { token: "test-b" })).status === 200, "compte invité accède à l'organisation après acceptation");
  check((await call(newAdmin, { token: "test-b", method: "PATCH", body: { ...change, title: "TEST co-organisé" } })).status === 200, "deuxième organisateur peut modifier les informations");
  check((await call(newAdmin, { method: "PATCH", body: { ...invite, email: "third@example.test" } })).status === 409, "troisième organisateur refusé");
  check((await call(newAdmin, { token: "test-b", method: "PATCH", body: { action: "project", status: "closed", opensAt: null, closesAt: null } })).status === 200, "deuxième organisateur peut clôturer");
  const sharedExport = await call(`/api/projects/${createdProject.id}/export`, { token: "test-b", method: "POST" });
  check(sharedExport.status === 200, "deuxième organisateur peut exporter");
  const sharedFiles = unzip(Buffer.from(await sharedExport.arrayBuffer()));
  check(sharedFiles.get("site/index.html").toString().includes("TEST co-organisé") && ![...sharedFiles.values()].some((b) => b.toString().includes("b@example.test")), "informations modifiées exportées sans email d'invitation");
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=", "base64");
  input.sizeBytes = bytes.length;
  check((await call("/api/media/presign", { method: "POST", token: null, body: input })).status === 401, "authentification obligatoire");
  check((await call("/api/media/presign", { method: "POST", token: "invalid", body: input })).status === 401, "jeton invalide refusé");
  const otherAuthor = await call("/api/media/presign", { method: "POST", token: "test-b", body: input });
  check(otherAuthor.status === 403, `souvenir d'un autre auteur refusé (${otherAuthor.status})`);
  check((await call("/api/media/presign", { method: "POST", body: { ...input, filename: "evil.html" } })).status === 400, "extension incohérente refusée");
  check((await call("/api/media/presign", { method: "POST", body: { ...input, sizeBytes: 16 * 1024 * 1024 } })).status === 400, "taille excessive refusée");
  const presign = await call("/api/media/presign", { method: "POST", body: input }); check(presign.status === 200, "réservation média créée");
  const { uploadUrl, mediaId } = await presign.json();
  check((await call(`/api/media/${mediaId}`, { token: null })).status === 401, "lecture média sans session refusée avant finalisation");
  const preflight = await fetch(uploadUrl, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
  check(preflight.status === 204 && preflight.headers.get("access-control-allow-origin") === "http://localhost:3000", "CORS PUT accepté");
  check((await fetch(uploadUrl, { method: "PUT", body: bytes, headers: { "Content-Type": input.mimeType } })).ok, "PUT signé réel sur R2");
  check((await call(`/api/media/${mediaId}`, { method: "POST", token: "test-b" })).status === 403, "finalisation par autre auteur refusée");
  const finalized = await call(`/api/media/${mediaId}`, { method: "POST" });
  check(finalized.status === 200, `finalisation vérifiée : ${finalized.status}`);
  check((await call(`/api/media/${mediaId}`, { token: null })).status === 401, "média publié inaccessible sans session");
  check((await call(`/api/media/${mediaId}`, { token: "invalid" })).status === 401, "média publié inaccessible avec jeton invalide");
  const read = await call(`/api/media/${mediaId}`, { token: "test-b" }); check(read.status === 200, "GET authentifié autorisé pour parent publié");
  const { url } = await read.json(); check(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(bytes), "lecture signée : octets identiques");
  check((await fetch(uploadUrl, { method: "PUT", body: Buffer.alloc(bytes.length), headers: { "Content-Type": input.mimeType } })).ok, "PUT réutilisé cible seulement le temporaire");
  check(Buffer.from(await (await fetch(url)).arrayBuffer()).equals(bytes), "objet final inchangé après réutilisation du PUT");
  tables.memories[0].status = "draft";
  check((await call(`/api/media/${mediaId}`, { token: "test-b" })).status === 404, "parent brouillon rend le média privé aux autres comptes");
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
  if (process.argv.includes("--save-site")) {
    // Only synthetic public site files, in a fresh run directory; never private JSON.
    const output = resolve(".archive-tests", ids.project);
    for (const [name, content] of files) {
      if (!name.startsWith("site/") || name.endsWith("/")) continue;
      assert.ok(!name.includes("..") && !name.includes("\\") && !name.includes(":"));
      const target = resolve(output, name);
      assert.ok(target.startsWith(output + "/") || target.startsWith(output + "\\"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, { flag: "wx" });
    }
    console.log(`SITE DE TEST : ${output}/site/index.html`);
  }
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
  const deletePath = `/api/projects/${createdProject.id}`, deleteBody = { confirmation: createdProject.slug, archiveSaved: true };
  // The earlier shared-organizer scenario closed/exported this local fixture.
  // Start the deletion scenario afresh; no real Supabase data is involved.
  Object.assign(tables.projects.find(p => p.id === createdProject.id), { status: "open", archive_exported_at: null });
  check((await call(deletePath, { method: "DELETE", token: null, body: deleteBody })).status === 401, "suppression anonyme refusée");
  check((await call(deletePath, { method: "DELETE", token: "test-organizer", body: deleteBody })).status === 403, "organisateur d'un autre projet ne peut supprimer celui-ci");
  check((await call(deletePath, { method: "DELETE", body: deleteBody })).status === 409, "suppression d'un projet ouvert refusée");
  check((await call(newAdmin, { method: "PATCH", body: { action: "project", status: "archived", opensAt: null, closesAt: null } })).status === 409, "archivage sans clôture refusé");
  await call(newAdmin, { method: "PATCH", body: { action: "project", status: "closed", opensAt: null, closesAt: null } });
  check((await call(newAdmin, { method: "PATCH", body: { action: "project", status: "archived", opensAt: null, closesAt: null } })).status === 409, "archivage sans ZIP refusé");
  const emptyExport = await call(`/api/projects/${createdProject.id}/export`, { method: "POST" });
  const emptyFiles = unzip(Buffer.from(await emptyExport.arrayBuffer()));
  check(emptyFiles.get("site/index.html").toString().includes('data-theme="wedding"'), "archive autonome conserve le skin choisi");
  check((await call(newAdmin, { method: "PATCH", body: { action: "project", status: "archived", opensAt: null, closesAt: null } })).status === 200, "archivage après clôture et export réussi");
  check((await call(deletePath, { method: "DELETE", body: { ...deleteBody, confirmation: "wrong-slug" } })).status === 400, "suppression avec mauvaise confirmation refusée");
  check((await call(deletePath, { method: "DELETE", body: { ...deleteBody, archiveSaved: false } })).status === 400, "suppression sans confirmation de sauvegarde refusée");
  for (const suffix of ["orphan.bin", "uploads/staging.bin"]) {
    const key = `${createdProject.id}/${suffix}`; extraCleanupKeys.push(key);
    await storage.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: "TEST isolated cleanup" }));
  }
  check((await call(deletePath, { method: "DELETE", body: deleteBody })).status === 200, "suppression définitive du seul projet synthétique autorisée");
  check(!tables.projects.some(p => p.id === createdProject.id) && !tables.project_members.some(m => m.project_id === createdProject.id), "projet et appartenances supprimés");
  const remaining = await storage.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${createdProject.id}/` }));
  check(!remaining.Contents?.length && tables.projects.some(p => p.id === ids.project), "R2 nettoyé, temporaires et orphelins compris, autre projet conservé");
  console.log(`PASS : ${assertions} contrôles ; Auth/données fictives locales, R2 réel.`);
} finally {
  // Delete only keys derived from this run's UUIDs, never enumerating user objects.
  try {
    for (const key of extraCleanupKeys) await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    for (const row of tables.media_assets) {
      const staging = `${ids.project}/${row.owner_id}/uploads/${row.id}`;
      const final = `${ids.project}/${row.owner_id}/${row.id}-test-pixel.png`;
      await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: staging }));
      await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: final }));
    }
  } finally {
    // A storage failure must not leave a fixture or child server running.
    child.kill(); await new Promise((resolve) => fixture.close(resolve));
  }
}
}
await runChecks();
