import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { z } from "zod";
import { ApiError, apiError, jsonBody, projectAccess, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getR2Client } from "@/lib/r2";
import { mediaBucket } from "@/lib/media-server";
import { deleteProjectSchema, projectDeletionAllowed, purgeProjectObjects } from "@/lib/project-deletion";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = (await requestUser(request))!;
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
    const { project } = await projectAccess(id, user.id, true);
    const parsed = deleteProjectSchema.safeParse(await jsonBody(request));
    if (!parsed.success || parsed.data.confirmation !== project.slug) throw new ApiError(400, "Confirmez la sauvegarde du ZIP et recopiez exactement le lien du projet.");
    if (!projectDeletionAllowed(project)) throw new ApiError(409, "Clôturez, exportez puis archivez le projet avant de le supprimer.");
    const db = getSupabaseServiceClient();
    const { data: locked, error } = await db.rpc("begin_project_deletion", { p_project_id: id, p_actor: user.id, p_slug: parsed.data.confirmation });
    if (error?.message.includes("RECENT_UPLOADS_WAIT")) throw new ApiError(409, "Un média a été ajouté récemment. Attendez dix minutes après le dernier ajout, puis réessayez.");
    if (error || !locked) throw new ApiError(409, "Le projet ne peut pas être supprimé dans son état actuel. Actualisez la page.");
    const client = getR2Client(), bucket = mediaBucket();
    // Clean finalized, hidden, staging and orphaned objects within this exact
    // UUID namespace. Never delete metadata before storage is completely clean.
    await purgeProjectObjects(id, {
      async list(prefix) {
        const page = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000 }));
        return (page.Contents ?? []).map(item => item.Key).filter((key): key is string => !!key);
      },
      async remove(keys) {
        const result = await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys.map(Key => ({ Key })), Quiet: true } }));
        if (result.Errors?.length) throw new Error("Storage deletion incomplete");
      },
    });
    const finished = await db.rpc("finish_project_deletion", { p_project_id: id, p_actor: user.id });
    if (finished.error || !finished.data) throw new Error("Database deletion incomplete");
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
