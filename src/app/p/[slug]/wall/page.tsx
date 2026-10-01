import { notFound } from "next/navigation";
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
        {entries.map((entry) => <article className="card" key={entry.id}><p>{entry.message}</p><strong>{entry.display_name}</strong></article>)}
        {memories.map((memory) => <article className="card" key={memory.id}><p className="kicker">Souvenir</p>{memory.title && <h2>{memory.title}</h2>}<p>{memory.body}</p><strong>{memory.display_name}</strong></article>)}
      </section>
    </main>
  );
}
