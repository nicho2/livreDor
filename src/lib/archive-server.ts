import "server-only";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getR2Client } from "@/lib/r2";
import { checkedObject, mediaBucket } from "@/lib/media-server";
import { ApiError } from "@/lib/api-server";
import { archiveCss, archiveMediaPath, archiveReadme, renderStaticSite } from "@/lib/archive-render";
import type { GuestbookEntry, Memory, MediaAsset, Project } from "@/types/database";

async function rows<T>(table: "guestbook_entries" | "memories" | "media_assets", projectId: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseServiceClient().from(table).select("*").eq("project_id", projectId).order("id").range(offset, offset + 499);
    if (error) throw new Error("Database unavailable");
    result.push(...data as T[]);
    if (data.length < 500) return result;
  }
}
export async function projectArchive(project: Project, signal: AbortSignal) {
  // Export after closure: contributors cannot mutate data mid-archive.
  if (!["closed", "archived"].includes(project.status)) throw new ApiError(409, "Clôturez la collecte avant l'export final.");
  const [entries, memories, media] = await Promise.all([
    rows<GuestbookEntry>("guestbook_entries", project.id), rows<Memory>("memories", project.id), rows<MediaAsset>("media_assets", project.id),
  ]);
  const available = new Set<string>();
  const manifest: { id: string; path: string | null; reason?: string }[] = [];
  for (const item of media) {
    try {
      await checkedObject(item); available.add(item.id);
      const publicFile = item.status === "published" && memories.some((m) => m.id === item.memory_id && m.status === "published");
      manifest.push({ id: item.id, path: `${publicFile ? "site" : "archive-privee"}/${archiveMediaPath(item)}` });
    }
    catch (error) {
      if (!(error instanceof ApiError) || ![404, 409].includes(error.status)) throw error;
      // Missing published files must fail loudly, not yield a misleading "complete" archive.
      if (item.status === "published" && memories.some((m) => m.id === item.memory_id && m.status === "published")) throw new ApiError(409, `Le fichier « ${item.original_filename} » est absent ou non vérifié. Masquez-le ou réparez-le avant l'export.`);
      manifest.push({ id: item.id, path: null, reason: "Fichier supprimé, non vérifié ou upload inachevé." });
    }
  }
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const output = new PassThrough();
  archive.on("error", (error: Error) => output.destroy(error));
  archive.on("warning", (error: Error) => output.destroy(error));
  archive.pipe(output);
  signal.addEventListener("abort", () => { archive.abort(); output.destroy(); }, { once: true });
  const json = (name: string, value: unknown) => archive.append(JSON.stringify(value, null, 2), { name: `archive-privee/data/${name}.json` });
  // Explicit field selection: no profile/auth data or signed URLs enter an archive.
  const { id, slug, title, subject_name, description, event_date, opens_at, closes_at, status, created_at, theme } = project;
  json("project", { id, slug, title, subject_name, description, event_date, opens_at, closes_at, status, created_at, theme: theme ?? "album" });
  json("guestbook", entries); json("memories", memories); json("media", media); json("media-manifest", manifest);
  const participants = new Map<string, string>();
  for (const entry of [...entries, ...memories]) participants.set(entry.author_id, entry.display_name);
  json("participants", [...participants].map(([authorId, displayName]) => ({ id: authorId, display_name: displayName })));
  archive.append(archiveReadme, { name: "README.txt" });
  archive.append(archiveCss, { name: "site/assets/app.css" });
  archive.append(renderStaticSite({ project, entries, memories, media }, available), { name: "site/index.html" });
  // Download one file at a time, respecting stream backpressure; no multi-GB ZIP in RAM.
  async function appendMedia() {
    for (const item of media.filter((m) => available.has(m.id))) {
      if (signal.aborted || output.destroyed) return;
      const object = await getR2Client().send(new GetObjectCommand({ Bucket: mediaBucket(), Key: item.object_key }), { abortSignal: signal });
      if (!(object.Body instanceof Readable)) throw new Error("Storage stream unavailable");
      const isPublic = item.status === "published" && memories.some((m) => m.id === item.memory_id && m.status === "published");
      const name = `${isPublic ? "site" : "archive-privee"}/${archiveMediaPath(item)}`;
      await new Promise<void>((resolve, reject) => {
        const stream = object.Body as Readable;
        const entryComplete = (entry: { name: string }) => {
          if (entry.name !== name) return;
          archive.off("entry", entryComplete); stream.off("error", failed); resolve();
        };
        const failed = (error: Error) => { archive.off("entry", entryComplete); reject(error); };
        stream.once("error", failed);
        archive.on("entry", entryComplete);
        archive.append(stream, { name, store: true });
      });
    }
    await archive.finalize();
  }
  void appendMedia().catch((error) => { archive.abort(); output.destroy(error); });
  return Readable.toWeb(output) as ReadableStream<Uint8Array>;
}
