// Isolated UI fixture: no real Supabase, R2, email, or personal data is contacted.
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
const projectId = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000001";
const timestamp = "2026-10-03T12:00:00Z";
const user = { id: userId, aud: "authenticated", email: "recette@example.test", app_metadata: {}, user_metadata: {}, created_at: timestamp };
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 86400, role: "authenticated" })).toString("base64url")}.fixture`;
const formatting = { font: "serif", size: "md", align: "left", color: "ink", bold: false, italic: false };
const tables = {
  projects: [{ id: projectId, slug: "album-test", title: "Une nouvelle aventure", subject_name: "Camille", description: "Tous ces petits instants qui font une grande histoire.", status: "open", opens_at: null, closes_at: null, event_date: "2026-12-01", created_by: userId, created_at: timestamp }],
  project_members: [{ project_id: projectId, user_id: userId, role: "contributor" }],
  profiles: [{ id: userId, display_name: "Alex" }],
  guestbook_entries: Array.from({ length: 5 }, (_, i) => ({ id: `entry-${i}`, project_id: projectId, author_id: i ? `other-${i}` : userId, display_name: ["Alex", "Léa", "Sam", "Lou", "Morgan"][i], message: `Merci pour ces belles années ! Message ${i + 1} 🌻`, formatting, status: "published", created_at: timestamp, updated_at: timestamp })),
  memories: Array.from({ length: 30 }, (_, i) => ({ id: `30000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, project_id: projectId, author_id: `other-${i}`, display_name: "Léa", title: `Un bel instant ${i + 1}`, body: "Un café, des rires et cette journée que nous n’oublierons pas.\nUn souvenir à partager ensemble.", occurred_on: null, year_from: i === 29 ? null : 1990 + i, year_to: null, status: "published", created_at: timestamp })),
  media_assets: [],
};
tables.media_assets = [1, 2, 3].map(i => ({ id: `photo-${i}`, project_id: projectId, memory_id: tables.memories[0].id, owner_id: userId, kind: i === 3 ? "audio" : "image", object_key: "fixture", original_filename: i === 3 ? "signal.wav" : `album-${i}.png`, mime_type: i === 3 ? "audio/wav" : "image/png", size_bytes: 1024, status: "published", created_at: timestamp }));
async function body(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return JSON.parse(Buffer.concat(chunks).toString() || "{}"); }
const fixture = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3100");
  res.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, prefer");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") { res.end(); return; }
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/auth/v1/otp") { res.end("{}"); return; }
  if (url.pathname === "/auth/v1/verify") { await body(req); res.end(JSON.stringify({ access_token: token, token_type: "bearer", expires_in: 86400, refresh_token: "fixture-refresh", user })); return; }
  if (url.pathname === "/auth/v1/user") { res.end(JSON.stringify(user)); return; }
  if (url.pathname === "/auth/v1/logout") { res.end("{}"); return; }
  if (url.pathname.startsWith("/rest/v1/rpc/")) { res.end("false"); return; }
  const name = url.pathname.split("/").pop();
  const matches = row => [...url.searchParams].every(([key, value]) => {
    if (value.startsWith("eq.")) return String(row[key]) === value.slice(3);
    if (value.startsWith("neq.")) return String(row[key]) !== value.slice(4);
    if (value.startsWith("in.(")) return value.slice(4, -1).split(",").includes(row[key]);
    return true;
  });
  let rows = (tables[name] ?? []).filter(matches);
  if (req.method === "PATCH") { const values = await body(req); rows.forEach(row => Object.assign(row, values)); }
  if (req.method === "POST") { const values = await body(req); const row = { ...values, id: "new-entry", created_at: timestamp }; tables[name]?.push(row); rows = [row]; }
  res.end(JSON.stringify(req.headers.accept?.includes("application/vnd.pgrst.object+json") ? rows[0] ?? null : rows));
});
await new Promise(resolve => fixture.listen(54329, "127.0.0.1", resolve));
const proxy = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/media/")) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ url: `/fixture-assets/${url.pathname.endsWith("3") ? "signal.wav" : url.pathname.endsWith("2") ? "sortie.png" : "cafe.png"}` })); return; }
  if (url.pathname.startsWith("/fixture-assets/")) { const name = url.pathname.split("/").pop(); if (!["cafe.png", "sortie.png", "signal.wav"].includes(name)) { res.writeHead(404); res.end(); return; } res.setHeader("Content-Type", name.endsWith("wav") ? "audio/wav" : "image/png"); res.end(readFileSync(new URL(`../fixtures/seed-v1/assets/${name}`, import.meta.url))); return; }
  const upstream = httpRequest({ hostname: "127.0.0.1", port: url.pathname.startsWith("/auth/v1/") || url.pathname.startsWith("/rest/v1/") ? 54329 : 3101, path: req.url, method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
  upstream.on("error", () => { res.writeHead(503); res.end("Fixture starting"); }); req.pipe(upstream);
});
await new Promise(resolve => proxy.listen(3100, "127.0.0.1", resolve));
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...(process.argv.includes("--production") ? ["start"] : ["dev", "--webpack"]), "--port", "3101"], { stdio: "inherit", env: { ...process.env, LIVREDOR_UI_FIXTURE: "1", NEXT_PUBLIC_SUPABASE_URL: "http://localhost:3100", NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-only", SUPABASE_SERVICE_ROLE_KEY: "", R2_ACCESS_KEY_ID: "", R2_SECRET_ACCESS_KEY: "" } });
function close() { app.kill(); fixture.close(); proxy.close(); }
process.on("SIGINT", close); process.on("SIGTERM", close);
console.log("UI fixture: http://localhost:3100 — OTP fictif 123456, projet album-test");
