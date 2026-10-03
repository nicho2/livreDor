import { notFound } from "next/navigation";
import Link from "next/link";
import { memoryDateLabel } from "@/lib/presentation";
import { getProjectBySlug, getPublishedMemories } from "@/lib/project-data";

export default async function TimelinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const memories = await getPublishedMemories(project.id);

  return (
    <main className="stack">
      <div><p className="kicker">Chronologie</p><h1>L&apos;histoire de {project.subject_name}</h1></div>
      {memories.length === 0 ? <div className="empty">Les souvenirs datés apparaîtront ici.</div> : (
        <section className="timeline">
          {memories.map((memory) => <article className="timeline-item" key={memory.id}><strong>{memoryDateLabel(memory)}</strong><h2><Link href={`/p/${slug}/memories/${memory.id}`}>{memory.title ?? "Souvenir"}</Link></h2><p className="message">{memory.body}</p><span className="muted">{memory.display_name}</span></article>)}
        </section>
      )}
    </main>
  );
}
