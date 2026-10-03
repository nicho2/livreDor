import { ProjectAccess } from "@/components/ProjectAccess";
export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectAccess slug={slug}>{children}</ProjectAccess>;
}
