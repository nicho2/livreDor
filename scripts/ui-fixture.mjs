// Isolated UI fixture: no real Supabase, R2, email, or personal data is contacted.
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const projectId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const timestamp = "2026-10-03T12:00:00Z";
const organizer = process.argv.includes("--organizer");
const proxyPort = Number(process.env.LIVREDOR_UI_FIXTURE_PORT ?? 3100);
const appPort = proxyPort + 1;
const backendPort = process.env.LIVREDOR_UI_FIXTURE_PORT ? proxyPort + 2 : 54329;
if (!Number.isInteger(proxyPort) || proxyPort < 1024 || proxyPort > 65533) throw new Error("Invalid fixture port");
const user = { id: userId, aud: "authenticated", email: "recette@example.test", email_confirmed_at: timestamp, app_metadata: {}, user_metadata: {}, created_at: timestamp };
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 86400, role: "authenticated" })).toString("base64url")}.fixture`;
const formatting = { font: "serif", size: "md", align: "left", color: "ink", bold: false, italic: false };
const largeAlbum = process.argv.includes("--large");
const tables = {
  projects: [{ id: projectId, slug: "album-test", title: "Une nouvelle aventure", subject_name: "Camille", description: "Tous ces petits instants qui font une grande histoire.", status: "open", opens_at: null, closes_at: null, event_date: "2026-12-01", created_by: userId, created_at: timestamp }],
  project_members: [{ project_id: projectId, user_id: userId, role: organizer ? "organizer" : "contributor" }],
  profiles: [{ id: userId, display_name: "Alex" }],
  guestbook_entries: Array.from({ length: 5 }, (_, i) => ({ id: `entry-${i}`, project_id: projectId, author_id: i ? `other-${i}` : userId, display_name: ["Alex", "Léa", "Sam", "Lou", "Morgan"][i], message: `Merci pour ces belles années ! Message ${i + 1} 🌻`, formatting, status: "published", created_at: timestamp, updated_at: timestamp })),
  memories: Array.from({ length: largeAlbum ? 300 : 30 }, (_, i) => ({ id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, project_id: projectId, author_id: `other-${i}`, display_name: "Léa", title: `Un bel instant ${i + 1}`, body: "Un café, des rires et cette journée que nous n’oublierons pas.\nUn souvenir à partager ensemble.", occurred_on: null, year_from: i === 29 ? null : 1990 + i, year_to: null, status: "published", created_at: timestamp })),
  media_assets: [],
  project_organizer_invites: [],
};
Object.assign(tables.projects[0], { theme: "album", content_revision: 0, archive_exported_at: null, deletion_started_at: null });
tables.media_assets = [1, 2, 3].map(i => ({ id: `photo-${i}`, project_id: projectId, memory_id: tables.memories[0].id, owner_id: userId, kind: i === 3 ? "audio" : "image", object_key: "fixture", original_filename: i === 3 ? "signal.wav" : `album-${i}.png`, mime_type: i === 3 ? "audio/wav" : "image/png", size_bytes: 1024, status: "published", created_at: timestamp }));
if (largeAlbum) {
  tables.media_assets = tables.memories.flatMap((memory, index) => Array.from({ length: 20 }, (_, i) => ({
    id: `large-${index}-${i}`, project_id: projectId, memory_id: memory.id, owner_id: userId,
    kind: i === 0 ? "image" : "document", object_key: "fixture", original_filename: i === 0 ? "cafe.png" : `document-${i}.txt`,
    mime_type: i === 0 ? "image/png" : "text/plain", size_bytes: 1024, status: "published", created_at: timestamp,
  })));
  tables.guestbook_entries[0].message = "Un long message, des souvenirs et des émotions 🌻. ".repeat(150);
}
async function body(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString() || "{}"); }
const fixture = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", `http://localhost:${proxyPort}`);
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, prefer");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") { res.end(); return; }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/auth/v1/otp") { res.end("{}"); return; }
  if (url.pathname === "/auth/v1/verify") { await body(req); res.end(JSON.stringify({ access_token: token, token_type: "bearer", expires_in: 86400, refresh_token: "fixture-refresh", user })); return; }
  if (url.pathname === "/auth/v1/user") { res.end(JSON.stringify(user)); return; }
  if (url.pathname === "/auth/v1/logout") { res.end("{}"); return; }
  if (["/rest/v1/rpc/create_project_limited", "/rest/v1/rpc/create_project_with_organizer"].includes(url.pathname)) {
    const input = await body(req);
    if (!organizer || req.headers.authorization !== "Bearer fixture-service" || input.p_actor !== userId) { res.writeHead(403); res.end(JSON.stringify({ code: "42501", message: "Access denied" })); return; }
    if (tables.projects.some(row => row.slug === input.p_slug)) { res.writeHead(409); res.end(JSON.stringify({ code: "23505", message: "Duplicate slug" })); return; }
    if (tables.projects.length >= input.p_limit) { res.writeHead(409); res.end(JSON.stringify({ code: "P0001", message: "PROJECT_LIMIT_REACHED" })); return; }
    const project = { id: randomUUID(), slug: input.p_slug, title: input.p_title, subject_name: input.p_subject_name, description: input.p_description, event_date: input.p_event_date, status: "open", created_by: userId, created_at: new Date().toISOString(), opens_at: null, closes_at: null, theme: "album", content_revision: 0, archive_exported_at: null, deletion_started_at: null };
    tables.projects.push(project);
    tables.project_members.push({ project_id: project.id, user_id: userId, role: "organizer" });
    if (input.p_organizer_email && input.p_organizer_email !== user.email) tables.project_organizer_invites.push({ project_id: project.id, email: input.p_organizer_email, invited_by: userId, accepted_by: null, created_at: timestamp });
    res.end(JSON.stringify([project])); return;
  }
  if (url.pathname.startsWith("/rest/v1/rpc/")) { res.end("false"); return; }
  const name = url.pathname.split("/").pop();
  const matches = row => [...url.searchParams].every(([key, value]) => {
    if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
    if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
    if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(row[key]);
    return true;
  });
  let rows = (tables[name] ?? []).filter(matches).slice(0, 1000);
  if (req.method === "PATCH") { const values = await body(req); rows.forEach(row => { Object.assign(row, values); if (name === "projects" && values.theme) { row.archive_exported_at = null; row.content_revision++; } }); }
  if (req.method === "POST") { const values = await body(req); const row = { ...values, id: randomUUID(), created_at: timestamp }; tables[name]?.push(row); rows = [row]; }
  res.end(JSON.stringify(req.headers.accept?.includes("application/vnd.pgrst.object+json") ? rows[0] ?? null : rows));
});
await new Promise(resolve => fixture.listen(backendPort, "127.0.0.1", resolve));
const proxy = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const projectRoute = url.pathname.match(/^\/api\/projects\/([0-9a-f-]{36})(\/export)?$/);
  const requestedProjectId = projectRoute?.[1];
  // UI-only deletion: remove synthetic rows in memory, never call R2.
  if (projectRoute && !projectRoute[2] && req.method === "DELETE") {
    res.setHeader("Content-Type", "application/json");
    // Browser sessions survive fixture restarts; accept the same synthetic user
    // with a still-valid fixture token, rather than only this process's token.
    let fixtureUser = false;
    try {
      const supplied = (req.headers.authorization ?? "").replace(/^Bearer /, "");
      const claims = JSON.parse(Buffer.from(supplied.split(".")[1], "base64url").toString());
      fixtureUser = supplied.endsWith(".fixture") && claims.sub === userId && claims.exp > Date.now() / 1000;
    } catch { /* Anonymous or malformed fixture token. */ }
    if (!organizer || !fixtureUser) { res.writeHead(403); res.end(JSON.stringify({ error: "Accès organisateur requis." })); return; }
    let input;
    try { input = await body(req); } catch { res.writeHead(400); res.end(JSON.stringify({ error: "Confirmation invalide." })); return; }
    const project = tables.projects.find(row => row.id === requestedProjectId);
    if (!project) { res.writeHead(404); res.end(JSON.stringify({ error: "Projet introuvable." })); return; }
    if (input.confirmation !== project.slug || input.archiveSaved !== true) { res.writeHead(400); res.end(JSON.stringify({ error: "Confirmez la sauvegarde et le lien du projet." })); return; }
    if (project.status !== "archived" || !project.archive_exported_at) { res.writeHead(409); res.end(JSON.stringify({ error: "Clôturez, exportez puis archivez le projet." })); return; }
    tables.projects = tables.projects.filter(row => row.id !== requestedProjectId);
    for (const name of ["project_members", "guestbook_entries", "memories", "media_assets", "project_organizer_invites"]) tables[name] = tables[name].filter(row => row.project_id !== requestedProjectId);
    res.end(JSON.stringify({ ok: true })); return;
  }
  // UX-only blob: the real ZIP and storage cleanup have separate integration tests.
  if (organizer && projectRoute?.[2] && req.method === "POST") {
    const project = tables.projects.find(row => row.id === requestedProjectId);
    if (!project || !["closed", "archived"].includes(project.status)) { res.writeHead(409, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Clôturez le projet avant de préparer le ZIP." })); return; }
    project.archive_exported_at = new Date().toISOString();
    res.setHeader("Content-Type", "application/zip"); res.end("FICTITIOUS UI ARCHIVE — NOT A REAL EXPORT"); return;
  }
  // Simulated upload lifecycle for editor regression tests; no real storage is contacted.
  if (url.pathname === "/api/media/presign" && req.method === "POST") {
    const input = await body(req);
    const mediaId = randomUUID();
    const kind = ["image", "audio", "video"].find(type => input.mimeType.startsWith(`${type}/`)) ?? "document";
    tables.media_assets.push({ id: mediaId, project_id: input.projectId, memory_id: input.memoryId, owner_id: userId, kind, object_key: "fixture", original_filename: input.filename, mime_type: input.mimeType, size_bytes: input.sizeBytes, status: "draft", created_at: timestamp });
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ mediaId, uploadUrl: `http://localhost:${proxyPort}/fixture-upload/${mediaId}` })); return;
  }
  if (url.pathname.startsWith("/fixture-upload/") && req.method === "PUT") {
    const media = tables.media_assets.find(row => row.id === url.pathname.split("/").pop());
    for await (const chunk of req) { void chunk; }
    res.writeHead(media?.original_filename === "refuse.png" ? 503 : 200); res.end(); return;
  }
  if (url.pathname.startsWith("/api/media/")) {
    const id = url.pathname.split("/").pop();
    const media = tables.media_assets.find(row => row.id === id);
    res.setHeader("Content-Type", "application/json");
    if (req.method === "DELETE") { tables.media_assets = tables.media_assets.filter(row => row.id !== id); res.end("{}"); return; }
    if (req.method === "POST" && media) { media.status = "published"; res.end("{}"); return; }
    res.end(JSON.stringify({ url: `/fixture-assets/${media?.kind === "audio" ? "signal.wav" : media?.kind === "video" ? "animation.mp4" : media?.kind === "image" ? "cafe.png" : url.pathname.endsWith("3") ? "signal.wav" : url.pathname.endsWith("2") ? "sortie.png" : "cafe.png"}` })); return;
  }
  if (url.pathname.startsWith("/fixture-assets/")) { const name = url.pathname.split("/").pop(); if (!["cafe.png", "sortie.png", "signal.wav", "animation.mp4"].includes(name)) { res.writeHead(404); res.end(); return; } res.setHeader("Content-Type", name.endsWith("wav") ? "audio/wav" : name.endsWith("mp4") ? "video/mp4" : "image/png"); res.end(readFileSync(new URL(`../fixtures/seed-v1/assets/${name}`, import.meta.url))); return; }
  const upstream = httpRequest({ hostname: "127.0.0.1", port: url.pathname.startsWith("/auth/v1/") || url.pathname.startsWith("/rest/v1/") ? backendPort : appPort, path: req.url, method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
  upstream.on("error", () => { res.writeHead(503); res.end("Fixture starting"); }); req.pipe(upstream);
});
await new Promise(resolve => proxy.listen(proxyPort, "127.0.0.1", resolve));
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...(process.argv.includes("--production") ? ["start"] : ["dev", "--webpack"]), "--port", String(appPort)], { stdio: "inherit", env: { ...process.env, LIVREDOR_UI_FIXTURE: "1", LIVREDOR_SITE_MANAGERS: organizer ? "recette@example.test" : "", NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${proxyPort}`, NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-only", SUPABASE_SERVICE_ROLE_KEY: "fixture-service", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "" } });
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  if (app.pid && app.exitCode === null && app.signalCode === null) {
    if (process.platform === "win32") {
      // Next dev can spawn children: terminating only its parent leaves ports open.
      await new Promise(resolve => {
        const stop = spawn("taskkill.exe", ["/PID", String(app.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
        stop.once("error", resolve); stop.once("exit", resolve);
      });
    } else { app.kill("SIGTERM"); }
  }
  fixture.closeAllConnections(); proxy.closeAllConnections();
  await Promise.all([fixture, proxy].map(server => new Promise(resolve => server.close(resolve))));
  process.exitCode = code;
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
app.once("error", () => { console.error("Impossible de démarrer le serveur de recette."); void close(1); });
app.once("exit", code => void close(code ?? 1));
console.log(`RECETTE À OUVRIR : http://localhost:${proxyPort}/auth?next=/p/album-test/guestbook`);
console.log("Email fictif : recette@example.test — code : 123456 (aucun email envoyé)");
console.log(`Le port Next ${appPort} est interne : les accès directs sont redirigés vers ${proxyPort}.`);
