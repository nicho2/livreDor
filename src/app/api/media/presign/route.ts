import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getR2Client } from "@/lib/r2";
import { validateMediaFile, safeFilename } from "@/lib/media";
import { presignSchema } from "@/lib/validators";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { ApiError, apiError, contributionAccess, jsonBody, requestUser } from "@/lib/api-server";
import { mediaBucket, uploadKey } from "@/lib/media-server";

export async function POST(request: Request) {
  try {
    const user = (await requestUser(request))!;
    const parsed = presignSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new ApiError(400, "Informations du fichier invalides.");
    const input = parsed.data;
    const validation = validateMediaFile(input.filename, input.mimeType, input.sizeBytes);
    if (!validation.ok) throw new ApiError(400, validation.error);
    await contributionAccess(input.projectId, user.id);
    const db = getSupabaseServiceClient();
    const { data: memory, error: memoryError } = await db.from("memories").select("id")
      .eq("id", input.memoryId).eq("project_id", input.projectId).eq("author_id", user.id).neq("status", "hidden").maybeSingle();
    if (memoryError) throw new Error("Database unavailable");
    if (!memory) throw new ApiError(403, "Enregistrez votre souvenir avant d'y joindre un média.");
    const { count, error: countError } = await db.from("media_assets").select("id", { head: true, count: "exact" })
      .eq("memory_id", input.memoryId).neq("status", "hidden");
    if (countError) throw new Error("Database unavailable");
    if ((count ?? 0) >= 20) throw new ApiError(400, "Limite de 20 médias par souvenir atteinte.");
    const id = crypto.randomUUID();
    const { data: media, error } = await db.from("media_assets").insert({
      id, project_id: input.projectId, memory_id: input.memoryId, owner_id: user.id,
      kind: validation.kind, object_key: `${input.projectId}/${user.id}/${id}-${safeFilename(input.filename)}`,
      original_filename: input.filename, mime_type: input.mimeType, size_bytes: input.sizeBytes, status: "draft",
    }).select("*").single();
    if (error || !media) throw new Error("Database unavailable");
    const uploadUrl = await getSignedUrl(getR2Client(), new PutObjectCommand({
      Bucket: mediaBucket(), Key: uploadKey(media), ContentType: input.mimeType, ContentLength: input.sizeBytes,
    }), { expiresIn: 300 });
    return NextResponse.json({ uploadUrl, mediaId: id, expiresInSeconds: 300 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
