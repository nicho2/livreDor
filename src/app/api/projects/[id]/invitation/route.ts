import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, ApiError, projectAccess, requestUser } from "@/lib/api-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type Context = { params: Promise<{ id: string }> };
async function invitation(request: Request, context: Context, renew: boolean) {
  try {
    const user = (await requestUser(request))!;
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
    const { project } = await projectAccess(id, user.id, true);
    const { data, error } = await getSupabaseServiceClient().rpc("shared_project_invitation", {
      p_project_id: id, p_actor: user.id, p_token: randomBytes(32).toString("hex"), p_renew: renew,
    });
    if (error || !data) throw new Error("Invitation unavailable");
    return NextResponse.json({ path: `/p/${project.slug}?invitation=${data}` }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
// POST retrieves or initializes; PATCH explicitly invalidates the previous link.
export function POST(request: Request, context: Context) { return invitation(request, context, false); }
export function PATCH(request: Request, context: Context) { return invitation(request, context, true); }
