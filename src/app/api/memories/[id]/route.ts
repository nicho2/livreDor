import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiError, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { mediaBucket, uploadKey, validateObjectKey } from "@/lib/media-server";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = (await requestUser(request))!;
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
    const db = getSupabaseServiceClient();
    const started = await db.rpc("begin_memory_deletion", { p_memory_id: id, p_actor: user.id });
    if (started.error) {
      if (started.error.message.includes("RECENT_UPLOADS_WAIT")) throw new ApiError(409, "Un envoi de fichier n’est pas terminé. Attendez la fin de l’envoi, puis réessayez. Si l’envoi a échoué, réessayez dix minutes après son début.");
      if (started.error.code === "42501") throw new ApiError(403, "Vous pouvez supprimer uniquement vos souvenirs pendant la collecte.");
      if (started.error.code === "PGRST202") throw new ApiError(503, "La suppression des souvenirs n’est pas encore activée dans la base de données.");
      throw new ApiError(409, "La suppression ne peut pas commencer. Réessayez.");
    }
    // Preserve metadata until every R2 operation succeeds, so retries can finish.
    const media = await db.from("media_assets").select("*").eq("memory_id", id).eq("project_id", started.data.project_id);
    if (media.error) throw new Error("Database unavailable");
    for (const asset of media.data) {
      validateObjectKey(asset);
      await getR2Client().send(new DeleteObjectCommand({ Bucket: mediaBucket(), Key: asset.object_key }));
      await getR2Client().send(new DeleteObjectCommand({ Bucket: mediaBucket(), Key: uploadKey(asset) }));
    }
    const finished = await db.rpc("finish_memory_deletion", { p_memory_id: id, p_actor: user.id });
    if (finished.error || !finished.data) throw new Error("Memory deletion incomplete");
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
