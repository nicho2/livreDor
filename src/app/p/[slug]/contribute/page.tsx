import { notFound } from "next/navigation";
import { ContributionForm } from "@/components/ContributionForm";
import { getProjectBySlug } from "@/lib/project-data";

export default async function ContributePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="stack">
      <div><p className="kicker">Contribution</p><h1>{project.subject_name}</h1><p className="muted">Commencez par votre message. Les souvenirs et médias viennent ensuite.</p></div>
      <ContributionForm projectId={project.id} />
      <div className="card"><h2>Étape suivante</h2><p>Le formulaire de souvenirs multiples est prévu dans le backlog Phase 3. Il doit rester séparé du message principal.</p></div>
    </main>
  );
}
