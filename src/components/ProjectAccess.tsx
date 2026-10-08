"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { ProjectNav } from "@/components/ProjectNav";
import { ProjectTheme } from "@/components/ThemeProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { projectWindow } from "@/lib/presentation";
import type { Project } from "@/types/database";

const ProjectContext = createContext<Project | null>(null);
const ProjectUpdateContext = createContext<((project: Project) => void) | null>(null);
export function useProjectUpdate() {
  const update = useContext(ProjectUpdateContext);
  if (!update) throw new Error("Projet non chargé.");
  return update;
}
export function useProject() {
  const project = useContext(ProjectContext);
  if (!project) throw new Error("Projet non chargé.");
  return project;
}

function AuthenticatedProject({ slug, children }: { slug: string; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const invitation = searchParams.get("invitation");
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const db = getSupabaseBrowser();
        const accepted = await db.rpc("accept_shared_project_invitation", { p_slug: slug, ...(invitation ? { p_token: invitation } : {}) });
        if (accepted.error) throw new Error("Impossible de vérifier l’accès au projet. Réessayez.");
        if (!accepted.data) throw new Error("Accès refusé. Ouvrez le lien d’invitation transmis par l’organisateur. Le lien peut avoir été renouvelé ou la collecte clôturée.");
        const { data, error } = await getSupabaseBrowser().from("projects").select("*").eq("slug", slug).maybeSingle();
        if (error) throw new Error("Impossible de charger le projet. Réessayez.");
        if (!data) throw new Error("Projet introuvable ou accès refusé.");
        if (active) {
          setError(""); setProject(data);
          // Remove the credential from navigation/history once access is memorized.
          if (invitation) router.replace(`/p/${slug}`);
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Chargement impossible.");
      }
    }
    void load();
    return () => { active = false; };
  }, [slug, invitation, router]);
  if (!user) return null;
  if (error) return <p role="alert" className="notice">{error}</p>;
  if (!project) return <p role="status" className="notice">Chargement du projet…</p>;
  const { closed, future } = projectWindow(project);
  return <ProjectUpdateContext.Provider value={setProject}><ProjectContext.Provider value={project}>
    <ProjectTheme theme={project.theme} global>
    <ProjectNav slug={slug} projectId={project.id} />
    {closed && <p className="notice">La collecte est clôturée. Les souvenirs restent consultables après connexion ; les contributions ne peuvent plus être modifiées.</p>}
    {!closed && future && <p className="notice">La collecte n&apos;est pas encore ouverte.</p>}
    {children}
    </ProjectTheme>
  </ProjectContext.Provider></ProjectUpdateContext.Provider>;
}

export function ProjectAccess({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const invitation = searchParams.get("invitation");
  const returnTo = invitation ? `${pathname}?invitation=${invitation}` : pathname;
  // No personal data in server props or RSC payloads. RLS also denies anon reads.
  // Remount on account changes so a previous user's private state cannot survive.
  return <RequireAuth returnTo={returnTo}>
    <AuthenticatedProject key={`${slug}:${user?.id ?? "anonymous"}`} slug={slug}>{children}</AuthenticatedProject>
  </RequireAuth>;
}
