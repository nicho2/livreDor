import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiError, jsonBody, projectAccess, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { checkedObject, deleteMedia } from "@/lib/media-server";
type Context = { params: Promise<{ id: string }> };
async function access(request: Request, context: Context) {
  const user = (await requestUser(request))!;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
  const { project } = await projectAccess(id, user.id, true);
  return { user, project };
}
async function allRows(table: "guestbook_entries" | "memories" | "media_assets", projectId: string) {
  const db = getSupabaseServiceClient();
  const rows = [];
  // Supabase caps results: never silently drop contributions after the first page.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select("*").eq("project_id", projectId).order("id").range(offset, offset + 499);
    if (error) throw new Error("Database unavailable");
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function GET(request: Request, context: Context) {
  try {
    const { project } = await access(request, context);
    const [entries, memories, media] = await Promise.all([allRows("guestbook_entries", project.id), allRows("memories", project.id), allRows("media_assets", project.id)]);
    return NextResponse.json({ project, entries, memories, media }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("moderate"), table: z.enum(["guestbook_entries", "memories", "media_assets"]), contentId: z.string().uuid(), status: z.enum(["draft", "published", "hidden"]) }),
  z.object({ action: z.literal("project"), status: z.enum(["open", "closed", "archived"]), opensAt: z.iso.datetime().nullable(), closesAt: z.iso.datetime().nullable() }).refine((v) => !v.opensAt || !v.closesAt || Date.parse(v.opensAt) < Date.parse(v.closesAt), { message: "La clôture doit suivre l'ouverture." }),
  z.object({ action: z.literal("delete-media"), contentId: z.string().uuid() }),
]);
export async function PATCH(request: Request, context: Context) {
  try {
    const { project, user } = await access(request, context);
    const parsed = actionSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Requête invalide.");
    const action = parsed.data, db = getSupabaseServiceClient();
    if (action.action === "project") {
      const { error } = await db.from("projects").update({ status: action.status, opens_at: action.opensAt, closes_at: action.closesAt }).eq("id", project.id).select("id").single();
      if (error) throw new Error("Database unavailable");
    } else if (action.action === "delete-media") {
      const { data: media, error } = await db.from("media_assets").select("*").eq("project_id", project.id).eq("id", action.contentId).maybeSingle();
      if (error) throw new Error("Database unavailable");
      if (!media) throw new ApiError(404, "Média introuvable.");
      await deleteMedia(media, user.id);
    } else {
      if (action.table === "media_assets" && action.status === "published") {
        const { data: media, error } = await db.from("media_assets").select("*").eq("id", action.contentId).eq("project_id", project.id).maybeSingle();
        if (error) throw new Error("Database unavailable");
        if (!media) throw new ApiError(404, "Média introuvable.");
        await checkedObject(media);
      }
      const { error } = await db.from(action.table).update({ status: action.status }).eq("project_id", project.id).eq("id", action.contentId).select("id").single();
      if (error) throw new ApiError(404, "Contenu introuvable ou modification impossible.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
