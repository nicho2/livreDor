import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/project-data";

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return (
    <main className="stack">
      <div><p className="kicker">Administration</p><h1>{project.title}</h1></div>
      <div className="card"><h2>À implémenter en priorité</h2><p>Cette route est volontairement un squelette. Avant production, elle doit vérifier le rôle <code>organizer</code> côté serveur puis fournir les actions publier, masquer, corriger et clôturer.</p></div>
    </main>
  );
}
