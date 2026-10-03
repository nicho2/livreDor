// Optional streaming download for large archives. Uses the same role-checked API as the UI.
// Never provide the authentication token as a CLI argument or commit it in a file.
import { createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
const [projectId, outputName] = process.argv.slice(2);
const token = process.env.LIVREDOR_EXPORT_TOKEN;
const origin = process.env.LIVREDOR_LOCAL_URL || "http://localhost:3000";
if (!projectId || !/^[0-9a-f-]{36}$/i.test(projectId) || !outputName || !token) {
  console.error("Utilisez l'espace Organisation pour l'export ZIP. Pour un téléchargement sur disque : définir LIVREDOR_EXPORT_TOKEN (session organisateur), puis node scripts/export-project.mjs UUID fichier.zip. Le projet doit être clôturé.");
  process.exitCode = 1;
} else {
  const url = new URL(origin);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error("Cet outil est réservé au serveur local.");
  const response = await fetch(new URL(`/api/projects/${projectId}/export`, url), { method: "POST", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || "Export refusé.");
  }
  if (!response.body) throw new Error("Archive vide.");
  // wx never overwrites an existing archive. An interrupted download is explicitly partial.
  const destination = resolve(outputName);
  const partial = `${destination}.partial`;
  await pipeline(Readable.fromWeb(response.body), createWriteStream(partial, { flags: "wx" }));
  // Hard link atomically refuses an existing destination; only this run's partial is removed.
  const { link, unlink } = await import("node:fs/promises");
  await link(partial, destination);
  await unlink(partial);
  console.log(`Archive téléchargée : ${destination}`);
}
