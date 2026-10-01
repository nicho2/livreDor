import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { getR2Client } from "@/lib/r2";
import { validateMedia, safeFilename } from "@/lib/media";
import { presignSchema } from "@/lib/validators";
import { getSupabaseServiceClient, getUserFromBearerToken } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const user = await getUserFromBearerToken(token);
    if (!user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

    const parsed = presignSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide.", details: parsed.error.flatten() }, { status: 400 });
    }

    const mediaValidation = validateMedia(parsed.data.mimeType, parsed.data.sizeBytes);
    if (!mediaValidation.ok) {
      return NextResponse.json({ error: mediaValidation.error }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();
    const { data: membership } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", parsed.data.projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Accès au projet refusé." }, { status: 403 });
    }

    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket) throw new Error("R2_BUCKET_NAME is missing.");

    const cleanName = safeFilename(parsed.data.filename);
    const objectKey = `${parsed.data.projectId}/${user.id}/${crypto.randomUUID()}-${cleanName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: parsed.data.mimeType,
      ContentLength: parsed.data.sizeBytes,
      Metadata: {
        projectId: parsed.data.projectId,
        ownerId: user.id,
        mediaKind: mediaValidation.kind,
      },
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 15 * 60 });

    return NextResponse.json({
      uploadUrl,
      objectKey,
      kind: mediaValidation.kind,
      expiresInSeconds: 900,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur pendant la préparation de l'upload." }, { status: 500 });
  }
}
