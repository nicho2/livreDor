import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { projectLimit } from "@/lib/project-quota";
import { createProjectSchema, projectDetailsRow } from "@/lib/project-settings";
import { isSiteManager } from "@/lib/site-manager";

export async function POST(request: Request) {
  try {
    const user = (await requestUser(request))!;
    if (!isSiteManager(user, process.env.LIVREDOR_SITE_MANAGERS)) throw new ApiError(403, "La création est réservée aux gestionnaires du site.");
    const parsed = createProjectSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Informations invalides.");
    const details = projectDetailsRow(parsed.data);
    let limit: number;
    try { limit = projectLimit(process.env.LIVREDOR_MAX_PROJECTS); }
    catch { throw new ApiError(503, "La limite de projets est mal configurée. Contactez l'administrateur du site."); }
    // Neither actor nor limit comes from the browser; the service-only RPC
    // performs count+creation atomically after this verified session check.
    const { data, error } = await getSupabaseServiceClient().rpc("create_project_limited", {
      p_actor: user.id, p_limit: limit,
      p_slug: parsed.data.slug, p_title: details.title, p_subject_name: details.subject_name,
      p_description: details.description, p_event_date: details.event_date,
    });
    if (error?.code === "23505") throw new ApiError(409, "Ce lien existe déjà. Choisissez un autre lien ; aucun projet existant n'a été modifié.");
    if (error?.code === "P0001" && error.message === "PROJECT_LIMIT_REACHED") throw new ApiError(409, "La capacité de projets du site est atteinte. Aucun nouveau projet ne peut être créé pour le moment.");
    if (error?.code === "PGRST202" || error?.code === "42883") throw new ApiError(503, "La création n'est pas encore activée. Appliquez la migration Supabase 0006_project_quota.sql.");
    if (error) throw new Error("Database unavailable");
    // PostgREST returns composite rows as an array; tolerate a single-row object too.
    const project = Array.isArray(data) ? data[0] : data;
    if (!project?.id || !project.slug) throw new Error("Invalid database response");
    return NextResponse.json({ id: project.id, slug: project.slug }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
