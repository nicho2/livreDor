import { NextResponse } from "next/server";
import { ApiError, apiError, jsonBody, requestUser } from "@/lib/api-server";
import { getSupabaseAnonClient } from "@/lib/supabase-server";
import { createProjectSchema, projectDetailsRow } from "@/lib/project-settings";

export async function POST(request: Request) {
  try {
    await requestUser(request);
    const parsed = createProjectSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Informations invalides.");
    const details = projectDetailsRow(parsed.data);
    // Call as the authenticated user, not service-role: auth.uid() owns the transaction.
    const token = request.headers.get("authorization")!.slice(7);
    const { data, error } = await getSupabaseAnonClient(token).rpc("create_project", {
      p_slug: parsed.data.slug, p_title: details.title, p_subject_name: details.subject_name,
      p_description: details.description, p_event_date: details.event_date,
    });
    if (error?.code === "23505") throw new ApiError(409, "Ce lien existe déjà. Choisissez un autre lien ; aucun projet existant n'a été modifié.");
    if (error?.code === "PGRST202" || error?.code === "42883") throw new ApiError(503, "La création n'est pas encore activée. Appliquez la migration Supabase 0004_project_onboarding.sql.");
    if (error) throw new Error("Database unavailable");
    // PostgREST returns composite rows as an array; tolerate a single-row object too.
    const project = Array.isArray(data) ? data[0] : data;
    if (!project?.id || !project.slug) throw new Error("Invalid database response");
    return NextResponse.json({ id: project.id, slug: project.slug }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
