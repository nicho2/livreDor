import { NextResponse } from "next/server";
import { apiError, ApiError, requestUser } from "@/lib/api-server";
import { isSiteManager } from "@/lib/site-manager";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const user = (await requestUser(request))!;
    if (!isSiteManager(user, process.env.LIVREDOR_SITE_MANAGERS)) throw new ApiError(403, "Accès réservé aux gestionnaires du site.");
    const { data, error } = await getSupabaseServiceClient().from("projects").select("slug,title,subject_name").order("created_at", { ascending: false });
    if (error) throw new Error("Database unavailable");
    return NextResponse.json({ projects: data ?? [] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
