import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiError, jsonBody, projectAccess, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { getSupabaseAnonClient } from "@/lib/supabase-server";
import { checkedObject, deleteMedia } from "@/lib/media-server";
import { organizerEmailSchema, projectDetailsSchema, projectDetailsRow } from "@/lib/project-settings";
type Context = { params: Promise<{ id: string }> };
async function access(request: Request, context: Context) {
  const user = (await requestUser(request))!;
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
  // Allows an invited user to open /admin directly after OTP. No service-role promotion.
  await getSupabaseAnonClient(request.headers.get("authorization")!.slice(7)).rpc("accept_project_organizer_invite", { p_project_id: id });
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
    const { data: invitation, error: inviteError } = await getSupabaseServiceClient().from("project_organizer_invites").select("email,accepted_by").eq("project_id", project.id).maybeSingle();
    // Existing installations remain usable before migration 0005 (settings/moderation).
    if (inviteError && !["42P01", "PGRST205"].includes(inviteError.code)) throw new Error("Database unavailable");
    return NextResponse.json({ project, entries, memories, media, invitation, sharingReady: !inviteError }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
const actionSchema = z.discriminatedUnion("action", [
  projectDetailsSchema.extend({ action: z.literal("details") }),
  z.object({ action: z.literal("invite-organizer"), email: organizerEmailSchema }).strict(),
  z.object({ action: z.literal("cancel-invitation") }).strict(),
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
    if (action.action === "invite-organizer" || action.action === "cancel-invitation") {
      const caller = getSupabaseAnonClient(request.headers.get("authorization")!.slice(7));
      const { error } = action.action === "invite-organizer"
        ? await caller.rpc("invite_project_organizer", { p_project_id: project.id, p_email: action.email })
        : await caller.rpc("cancel_project_organizer_invite", { p_project_id: project.id });
      if (error?.code === "23514") throw new ApiError(409, "Invitation impossible : vérifiez l'adresse. Deux organisateurs maximum ; une invitation acceptée ne peut pas être remplacée ou annulée ici.");
      if (error?.code === "PGRST202") throw new ApiError(503, "Appliquez la migration Supabase 0005_shared_organization.sql pour activer le partage.");
      if (error) throw new Error("Database unavailable");
    } else if (action.action === "details") {
      const { error } = await db.from("projects").update(projectDetailsRow(action)).eq("id", project.id).select("id").single();
      if (error) throw new Error("Database unavailable");
    } else if (action.action === "project") {
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
