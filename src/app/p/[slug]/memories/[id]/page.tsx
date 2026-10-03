import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/project-data";
import { getSupabaseAnonClient } from "@/lib/supabase-server";
import { memoryDateLabel } from "@/lib/presentation";
import { MediaGallery } from "@/components/MediaGallery";
export default async function MemoryPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const { data: memory, error } = await getSupabaseAnonClient().from("memories").select("*").eq("id", id).eq("project_id", project.id).eq("status", "published").maybeSingle();
  if (error) throw new Error("Impossible de charger le souvenir.");
  if (!memory) notFound();
  return <main className="stack"><article className="card stack"><p className="kicker">{memoryDateLabel(memory)}</p><h1>{memory.title || "Souvenir"}</h1>
    <p className="message">{memory.body}</p><strong>{memory.display_name}</strong><MediaGallery projectId={project.id} memoryId={memory.id} />
  </article><Link href={`/p/${slug}/wall`}>Retour au mur des souvenirs</Link></main>;
}
