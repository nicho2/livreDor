import { NextResponse } from "next/server";
import { getSupabaseServiceClient, getUserFromBearerToken } from "@/lib/supabase-server";

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  // SDK requests may contain credentials: log only the exception class.
  console.error("API failure", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "Opération impossible. Réessayez dans quelques instants." }, { status: 500 });
}

export async function requestUser(request: Request, optional = false) {
  const header = request.headers.get("authorization");
  if (!header && optional) return null;
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Connectez-vous pour continuer.");
  const user = await getUserFromBearerToken(header.slice(7));
  if (!user) throw new ApiError(401, "Session expirée. Reconnectez-vous.");
  return user;
}

export async function projectAccess(projectId: string, userId: string, organizerOnly = false) {
  const db = getSupabaseServiceClient();
  const [p, m] = await Promise.all([
    db.from("projects").select("*").eq("id", projectId).maybeSingle(),
    db.from("project_members").select("role").eq("project_id", projectId).eq("user_id", userId).maybeSingle(),
  ]);
  if (p.error || m.error) throw new Error("Database unavailable");
  if (!p.data || !m.data || (organizerOnly && m.data.role !== "organizer")) throw new ApiError(403, "Accès au projet refusé.");
  return { project: p.data, role: m.data.role };
}

export async function contributionAccess(projectId: string, userId: string) {
  const { project } = await projectAccess(projectId, userId);
  const now = Date.now();
  if (project.status !== "open" || (project.opens_at && Date.parse(project.opens_at) > now) ||
    (project.closes_at && Date.parse(project.closes_at) <= now)) throw new ApiError(403, "La collecte est fermée. Vos contributions restent consultables.");
}

export async function jsonBody(request: Request) {
  try { return await request.json(); } catch { throw new ApiError(400, "Requête invalide."); }
}
