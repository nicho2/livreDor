import { ProjectAccess } from "@/components/ProjectAccess";
import { Suspense } from "react";
export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Suspense fallback={<p role="status">Chargement du projet…</p>}><ProjectAccess slug={slug}>{children}</ProjectAccess></Suspense>;
}
