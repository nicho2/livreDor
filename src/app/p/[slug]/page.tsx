import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectBySlug } from "@/lib/project-data";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main>
      <section className="hero">
        <p className="kicker">Pour {project.subject_name}</p>
        <h1>{project.title}</h1>
        {project.description && <p>{project.description}</p>}
        <div className="actions">
          <Link className="button" href={`/p/${slug}/contribute`}>Laisser un message</Link>
          <Link className="button secondary" href={`/p/${slug}/wall`}>Voir le mur</Link>
          <Link className="button secondary" href={`/p/${slug}/timeline`}>Chronologie</Link>
        </div>
      </section>
    </main>
  );
}
