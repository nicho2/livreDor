import { notFound } from "next/navigation";
import { ContributionForm } from "@/components/ContributionForm";
import { MemoryManager } from "@/components/MemoryManager";
import { RequireAuth } from "@/components/RequireAuth";
import { ContributionNameProvider } from "@/components/ContributionNameProvider";
import { getProjectBySlug } from "@/lib/project-data";

export default async function ContributePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="stack">
      <div><p className="kicker">Contribution</p><h1>{project.subject_name}</h1><p className="muted">Commencez par votre message. Les souvenirs et médias viennent ensuite.</p></div>
      <RequireAuth returnTo={`/p/${slug}/contribute`}>
        <ContributionNameProvider key={project.id} projectId={project.id}>
          <ContributionForm projectId={project.id} />
          <MemoryManager projectId={project.id} />
        </ContributionNameProvider>
      </RequireAuth>
    </main>
  );
}
