// Preview only public files saved by test-v1-integration.mjs --save-site.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import assert from "node:assert/strict";
const archiveRoot = resolve(".archive-tests");
const root = resolve(process.argv[2] ?? "");
assert.ok(root.startsWith(archiveRoot + sep) && root.endsWith(sep + "site"), "Pass a saved test site directory");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".wav": "audio/wav" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    response.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
});
server.listen(3102, "127.0.0.1", () => console.log("Archive de test : http://localhost:3102"));
process.on("SIGINT", () => server.close());
