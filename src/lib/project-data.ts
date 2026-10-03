import { getSupabaseAnonClient } from "@/lib/supabase-server";
import type { GuestbookEntry, Memory, Project } from "@/types/database";
import { chronologicalMemories } from "@/lib/presentation";

export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase.from("projects").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error("Impossible de charger le projet.");
  return (data as Project | null) ?? null;
}

export async function getPublishedGuestbook(projectId: string): Promise<GuestbookEntry[]> {
  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase
    .from("guestbook_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Impossible de charger le livre d'or.");
  return (data as GuestbookEntry[] | null) ?? [];
}

export async function getPublishedMemories(projectId: string): Promise<Memory[]> {
  const supabase = getSupabaseAnonClient();
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "published")
    .order("occurred_on", { ascending: true, nullsFirst: false });
  if (error) throw new Error("Impossible de charger les souvenirs.");
  return chronologicalMemories((data as Memory[] | null) ?? []);
}
