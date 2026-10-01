import { notFound } from "next/navigation";
import { getProjectBySlug, getPublishedMemories } from "@/lib/project-data";

function memoryDateLabel(memory: { occurred_on: string | null; year_from: number | null; year_to: number | null }) {
  if (memory.occurred_on) return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(`${memory.occurred_on}T12:00:00`));
  if (memory.year_from && memory.year_to && memory.year_from !== memory.year_to) return `${memory.year_from} – ${memory.year_to}`;
  if (memory.year_from) return String(memory.year_from);
  return "Date non précisée";
}

export default async function TimelinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const memories = await getPublishedMemories(project.id);

  return (
    <main className="stack">
      <div><p className="kicker">Chronologie</p><h1>L'histoire de {project.subject_name}</h1></div>
      {memories.length === 0 ? <div className="empty">Les souvenirs datés apparaîtront ici.</div> : (
        <section className="timeline">
          {memories.map((memory) => <article className="timeline-item" key={memory.id}><strong>{memoryDateLabel(memory)}</strong><h2>{memory.title ?? "Souvenir"}</h2><p>{memory.body}</p><span className="muted">{memory.display_name}</span></article>)}
        </section>
      )}
    </main>
  );
}
