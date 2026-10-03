import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, requestUser } from "@/lib/api-server";
import { getSupabaseAnonClient } from "@/lib/supabase-server";
import { deleteMedia, finalizeMedia, getMedia, mediaReadUrl } from "@/lib/media-server";
type Context = { params: Promise<{ id: string }> };
async function mediaId(context: Context) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
  return id;
}
export async function GET(request: Request, context: Context) {
  try {
    await requestUser(request);
    const token = request.headers.get("authorization")?.slice(7);
    const { data: media, error } = await getSupabaseAnonClient(token).from("media_assets").select("*").eq("id", await mediaId(context)).eq("status", "published").maybeSingle();
    if (error) throw new Error("Database unavailable");
    if (!media) throw new ApiError(404, "Média indisponible.");
    return NextResponse.json({ url: await mediaReadUrl(media), expiresInSeconds: 300 }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = (await requestUser(request))!;
    await finalizeMedia(await getMedia(await mediaId(context)), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const user = (await requestUser(request))!;
    await deleteMedia(await getMedia(await mediaId(context)), user.id);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
