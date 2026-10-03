import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/project-data";
import { RequireAuth } from "@/components/RequireAuth";
import { OrganizerPanel } from "@/components/OrganizerPanel";

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="stack">
      <div><p className="kicker">Administration</p><h1>{project.title}</h1></div>
      <RequireAuth returnTo={`/p/${slug}/admin`}><OrganizerPanel projectId={project.id} /></RequireAuth>
    </main>
  );
}
