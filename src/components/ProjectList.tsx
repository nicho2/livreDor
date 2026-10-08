"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Project } from "@/types/database";
import { authenticatedFetch } from "@/lib/api-client";

function AuthenticatedProjectList({ all = false }: { all?: boolean }) {
  const [projects, setProjects] = useState<Pick<Project, "slug" | "title" | "subject_name">[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (all) {
        const response = await authenticatedFetch("/api/site-manager/projects");
        const data = await response.json();
        if (active) setProjects(data.projects);
        return;
      }
      const { data, error } = await getSupabaseBrowser().from("projects").select("slug,title,subject_name").order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      if (error) setError("Impossible de charger les projets. Réessayez.");
      else setProjects(data ?? []);
    }
    void load().catch(() => { if (active) setError("Impossible de charger les projets. Réessayez."); });
    return () => { active = false; };
  }, [all]);
  if (error) return <p className="notice" role="alert">{error}</p>;
  if (!projects) return <p role="status">Chargement des projets…</p>;
  return <>{!projects.length && <p className="empty">{all ? "Aucun projet pour le moment." : "Aucun projet pour le moment. Ouvrez le lien d’invitation transmis par votre organisateur."}</p>}
    <div className="grid">{projects.map((project) => <article className="card" key={project.slug}>
      <h3>{project.title}</h3><p>{project.subject_name}</p><Link className="button" href={`/p/${project.slug}`}>Ouvrir le projet</Link>
    </article>)}</div></>;
}

export function ProjectList({ all = false }: { all?: boolean }) {
  const { user } = useAuth();
  return <section className="stack"><h2>{all ? "Tous les projets" : "Mes projets"}</h2><RequireAuth returnTo="/">
    <AuthenticatedProjectList key={user?.id ?? "anonymous"} all={all} />
  </RequireAuth></section>;
}
