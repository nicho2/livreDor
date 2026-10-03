import { notFound } from "next/navigation";
import Link from "next/link";
import { MediaGallery } from "@/components/MediaGallery";
import { formattingClasses, memoryDateLabel } from "@/lib/presentation";
import { getProjectBySlug, getPublishedGuestbook, getPublishedMemories } from "@/lib/project-data";

export default async function WallPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const [entries, memories] = await Promise.all([getPublishedGuestbook(project.id), getPublishedMemories(project.id)]);

  return (
    <main className="stack">
      <div><p className="kicker">Mur des souvenirs</p><h1>{project.subject_name}</h1></div>
      {entries.length === 0 && memories.length === 0 ? <div className="empty">Aucun contenu publié pour le moment.</div> : null}
      <section className="grid">
        {entries.map((entry) => <article className="card" key={entry.id}><p className={formattingClasses(entry.formatting)}>{entry.message}</p><strong>{entry.display_name}</strong></article>)}
        {memories.map((memory) => <article className="card stack" key={memory.id}><p className="kicker">{memoryDateLabel(memory)}</p><h2><Link href={`/p/${slug}/memories/${memory.id}`}>{memory.title || "Souvenir"}</Link></h2><p className="message">{memory.body}</p><strong>{memory.display_name}</strong><MediaGallery projectId={project.id} memoryId={memory.id} /></article>)}
      </section>
    </main>
  );
}
