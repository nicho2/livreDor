import { z } from "zod";
import { apiError, ApiError, projectAccess, requestUser } from "@/lib/api-server";
import { projectArchive } from "@/lib/archive-server";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = (await requestUser(request))!;
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
    const { project } = await projectAccess(id, user.id, true);
    const stream = await projectArchive(project, request.signal);
    const name = project.slug.replace(/[^a-z0-9-]/gi, "-");
    return new Response(stream, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="LivreDor-${name}.zip"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
