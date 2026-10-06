import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, apiError, jsonBody, projectAccess, requestUser } from "@/lib/api-server";
import { getSupabaseAnonClient, getSupabaseServiceClient } from "@/lib/supabase-server";
import { organizerMessageSchema } from "@/lib/contributor-information";
import { contactEmailConfiguration, notifyOrganizers } from "@/lib/organizer-email";

const schema = organizerMessageSchema.extend({ requestId: z.uuid() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = (await requestUser(request))!;
    if (!user.email || !user.email_confirmed_at) throw new ApiError(403, "Connexion email confirmée requise.");
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw new ApiError(400, "Projet invalide.");
    const input = schema.safeParse(await jsonBody(request));
    if (!input.success) throw new ApiError(400, "Message invalide.");
    const { project } = await projectAccess(id, user.id);
    if (project.deletion_started_at) throw new ApiError(409, "La suppression du projet est en cours.");
    try { contactEmailConfiguration(); }
    catch { throw new ApiError(503, "Le contact par email n’est pas encore configuré. Votre texte reste dans le formulaire. Contactez l’organisateur par le canal de votre invitation."); }
    const db = getSupabaseServiceClient();
    const members = await db.from("project_members").select("user_id").eq("project_id", id).eq("role", "organizer");
    if (members.error || !members.data?.length || members.data.length > 2) throw new ApiError(503, "Impossible de joindre les organisateurs. Votre texte reste dans le formulaire.");
    const recipients: string[] = [];
    for (const member of members.data) {
      const account = await db.auth.admin.getUserById(member.user_id);
      if (account.error || !account.data.user?.email || !account.data.user.email_confirmed_at) throw new ApiError(503, "Impossible de joindre les organisateurs. Votre texte reste dans le formulaire.");
      recipients.push(account.data.user.email);
    }
    const authorDb = getSupabaseAnonClient(request.headers.get("authorization")!.slice(7));
    const saved = await authorDb.rpc("send_organizer_message", {
      p_project_id: id, p_display_name: input.data.displayName, p_category: input.data.category,
      p_body: input.data.body, p_request_id: input.data.requestId,
    });
    if (saved.error?.code === "PGRST202" || saved.error?.code === "42P01") throw new ApiError(503, "Le contact n’est pas encore activé dans la base de données. Votre texte reste dans le formulaire. Prévenez l’organisateur.");
    if (saved.error) throw new ApiError(saved.error.code === "42501" ? 403 : 400, "Impossible d’enregistrer le message. Vérifiez votre accès et la limite de cinq messages par 24 heures.");
    const message = await db.from("organizer_messages").select("notification_sent_at,created_at").eq("id", saved.data).eq("project_id", id).eq("author_id", user.id).single();
    if (message.error) throw new Error("CONTACT_MESSAGE_UNAVAILABLE");
    if (!message.data.notification_sent_at) {
      // Resend retains its idempotency key for 24 hours; avoid ambiguous late duplicates.
      if (Date.now() - Date.parse(message.data.created_at) > 23 * 60 * 60 * 1000) throw new ApiError(409, "Message conservé dans Organisation. Une reprise tardive de l’email nécessite l’aide de l’organisateur.");
      try {
        await notifyOrganizers({ requestId: saved.data, projectTitle: project.title, displayName: input.data.displayName, body: input.data.body, category: input.data.category, replyTo: user.email, recipients });
      } catch { throw new ApiError(502, "Votre message est conservé dans Organisation, mais l’envoi de l’email n’est pas confirmé. Réessayez le même message : votre texte est conservé."); }
      const confirmed = await db.from("organizer_messages").update({ notification_sent_at: new Date().toISOString() }).eq("id", saved.data).eq("project_id", id);
      if (confirmed.error) throw new ApiError(502, "L’email a été accepté, mais sa confirmation n’a pas pu être enregistrée. Réessayez le même message.");
    }
    return NextResponse.json({ sent: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
