"use client";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";
export function CreateProject() {
  const router = useRouter();
  return <ProjectDetailsForm creating onSave={async (details) => {
    const response = await authenticatedFetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
    const project: { slug: string } = await response.json();
    // Treat even a server response as data, never an arbitrary navigation URL.
    if (!/^[a-z0-9][a-z0-9-]{2,79}$/.test(project.slug)) throw new Error("Lien du projet invalide.");
    router.push(`/p/${project.slug}/admin`); router.refresh();
  }} />;
}
