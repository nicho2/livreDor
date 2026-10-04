import { z } from "zod";
export const deleteProjectSchema = z.object({
  confirmation: z.string().min(3).max(80),
  archiveSaved: z.literal(true),
}).strict();

export function projectDeletionAllowed(project: { status: string; archive_exported_at?: string | null }) {
  return project.status === "archived" && !!project.archive_exported_at;
}

// Adapter kept small so partial storage failures can be tested without any
// credentials. Re-list the first page after deletion: never skip shifted keys.
export async function purgeProjectObjects(projectId: string, storage: {
  list: (prefix: string) => Promise<string[]>;
  remove: (keys: string[]) => Promise<void>;
}) {
  if (!z.uuid().safeParse(projectId).success) throw new Error("Invalid project identifier");
  const prefix = `${projectId}/`;
  for (let page = 0; page < 10000; page++) {
    const keys = await storage.list(prefix);
    if (!keys.length) return;
    if (keys.length > 1000 || keys.some(key => !key.startsWith(prefix))) throw new Error("Invalid storage page");
    await storage.remove(keys);
  }
  throw new Error("Storage cleanup incomplete; retry required");
}
