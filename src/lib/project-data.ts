import { getSupabaseServiceClient } from "@/lib/supabase-server";
import type { GuestbookEntry, Memory, Project } from "@/types/database";

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("projects").select("*").eq("slug", slug).maybeSingle();
  return (data as Project | null) ?? null;
}

export async function getPublishedGuestbook(projectId: string): Promise<GuestbookEntry[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("guestbook_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return (data as GuestbookEntry[] | null) ?? [];
}

export async function getPublishedMemories(projectId: string): Promise<Memory[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("memories")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("occurred_on", { ascending: true, nullsFirst: false });
  return (data as Memory[] | null) ?? [];
}
