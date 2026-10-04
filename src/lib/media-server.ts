import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "@/lib/r2";
import { ApiError, contributionAccess, projectAccess } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { validateMediaFile } from "@/lib/media";
import type { MediaAsset } from "@/types/database";

export function mediaBucket() {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("Missing R2 configuration");
  return bucket;
}
export function uploadKey(media: MediaAsset) { return `${media.project_id}/${media.owner_id}/uploads/${media.id}`; }
function proof(media: MediaAsset) {
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!secret) throw new Error("Missing R2 configuration");
  return createHmac("sha256", secret).update(JSON.stringify([
    media.id, media.project_id, media.owner_id, media.memory_id, media.object_key,
    media.mime_type, media.size_bytes, media.original_filename,
  ])).digest("hex");
}
export function validateObjectKey(media: MediaAsset) {
  const prefix = `${media.project_id}/${media.owner_id}/${media.id}-`;
  if (!media.object_key.startsWith(prefix) || media.object_key.includes("..") ||
    media.object_key.slice(prefix.length).includes("/")) throw new ApiError(409, "Média non vérifié.");
  const valid = validateMediaFile(media.original_filename, media.mime_type, media.size_bytes);
  if (!valid.ok || valid.kind !== media.kind) throw new ApiError(409, "Métadonnées du média invalides.");
}
export async function getMedia(id: string) {
  const { data, error } = await getSupabaseServiceClient().from("media_assets").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Database unavailable");
  if (!data) throw new ApiError(404, "Média introuvable.");
  return data;
}
export async function checkedObject(media: MediaAsset) {
  validateObjectKey(media);
  try {
    const head = await getR2Client().send(new HeadObjectCommand({ Bucket: mediaBucket(), Key: media.object_key }));
    const expected = proof(media), actual = head.Metadata?.verified ?? "";
    if (actual.length !== expected.length || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected)) ||
      head.ContentLength !== media.size_bytes || head.ContentType !== media.mime_type) throw new ApiError(409, "Média non vérifié.");
    return head;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && ["NotFound", "NoSuchKey"].includes(error.name)) throw new ApiError(404, "Fichier absent ou upload non terminé.");
    throw error;
  }
}
export async function finalizeMedia(media: MediaAsset, userId: string) {
  if (media.owner_id !== userId || media.status === "hidden") throw new ApiError(403, "Accès au média refusé.");
  await contributionAccess(media.project_id, userId);
  validateObjectKey(media);
  let finalized = false;
  try { await checkedObject(media); finalized = true; } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }
  const client = getR2Client(), bucket = mediaBucket();
  if (!finalized) {
    const staged = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: uploadKey(media) }));
    if (staged.ContentLength !== media.size_bytes || staged.ContentType !== media.mime_type) throw new ApiError(400, "Le fichier reçu ne correspond pas au fichier déclaré.");
    // PUT targets staging only. A live PUT URL cannot overwrite a finalized object.
    await client.send(new CopyObjectCommand({ Bucket: bucket, Key: media.object_key,
      CopySource: `${bucket}/${uploadKey(media)}`, CopySourceIfMatch: staged.ETag,
      MetadataDirective: "REPLACE", Metadata: { verified: proof(media) }, ContentType: media.mime_type }));
    await checkedObject(media);
  }
  await contributionAccess(media.project_id, userId);
  const { error } = await getSupabaseServiceClient().from("media_assets").update({ status: "published" }).eq("id", media.id);
  if (error) throw new Error("Database unavailable");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: uploadKey(media) }));
}
export async function mediaReadUrl(media: MediaAsset) {
  const { data: project, error } = await getSupabaseServiceClient().from("projects").select("deletion_started_at").eq("id", media.project_id).maybeSingle();
  if (error) throw new Error("Database unavailable");
  if (!project || project.deletion_started_at) throw new ApiError(409, "Le projet est en cours de suppression.");
  await checkedObject(media);
  return getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: mediaBucket(), Key: media.object_key,
    ResponseContentType: media.mime_type,
    ResponseContentDisposition: `${media.kind === "document" ? "attachment" : "inline"}; filename="${media.id}.${media.original_filename.split(".").pop()?.replace(/[^a-z0-9]/gi, "")}"`,
  }), { expiresIn: 300 });
}
export async function deleteMedia(media: MediaAsset, userId: string) {
  const { role, project } = await projectAccess(media.project_id, userId);
  if (project.deletion_started_at) throw new ApiError(409, "La suppression du projet est en cours.");
  if (role !== "organizer") {
    if (media.owner_id !== userId) throw new ApiError(403, "Accès au média refusé.");
    await contributionAccess(media.project_id, userId);
  }
  validateObjectKey(media);
  // Hide first; deletion remains retryable if storage is temporarily unavailable.
  const { error } = await getSupabaseServiceClient().from("media_assets").update({ status: "hidden" }).eq("id", media.id);
  if (error) throw new Error("Database unavailable");
  await getR2Client().send(new DeleteObjectCommand({ Bucket: mediaBucket(), Key: media.object_key }));
  await getR2Client().send(new DeleteObjectCommand({ Bucket: mediaBucket(), Key: uploadKey(media) }));
}
