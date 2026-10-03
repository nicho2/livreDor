import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/project-data";
import { ProjectNav } from "@/components/ProjectNav";
import { projectWindow } from "@/lib/presentation";
export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const { closed, future } = projectWindow(project);
  return <><ProjectNav slug={slug} projectId={project.id} />
    {closed && <p className="notice">La collecte est clôturée. Les souvenirs publiés restent consultables ; les contributions ne peuvent plus être modifiées.</p>}
    {!closed && future && <p className="notice">La collecte n&apos;est pas encore ouverte.</p>}
    {children}</>;
}
