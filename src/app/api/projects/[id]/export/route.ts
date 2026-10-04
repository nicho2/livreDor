import { z } from "zod";
import { apiError, ApiError, projectAccess, requestUser } from "@/lib/api-server";
import { projectArchive } from "@/lib/archive-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = (await requestUser(request))!;
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) throw new ApiError(400, "Identifiant invalide.");
    const { project } = await projectAccess(id, user.id, true);
    if (project.deletion_started_at) throw new ApiError(409, "La suppression de ce projet est en cours.");
    const stream = await projectArchive(project, request.signal);
    // Proof is recorded only after the whole ZIP has streamed successfully and
    // only if its data revision is still current. A failed/aborted export grants nothing.
    const confirmedStream = stream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      async flush() {
        const { data, error } = await getSupabaseServiceClient().rpc("confirm_project_export", { p_project_id: id, p_revision: project.content_revision ?? 0 });
        if (error || !data) throw new Error("Le projet a changé pendant l'export. Préparez une nouvelle archive.");
      },
    }));
    const name = project.slug.replace(/[^a-z0-9-]/gi, "-");
    return new Response(confirmedStream, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="LivreDor-${name}.zip"`, "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
