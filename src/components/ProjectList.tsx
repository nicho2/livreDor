"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { Project } from "@/types/database";

function AuthenticatedProjectList() {
  const [projects, setProjects] = useState<Pick<Project, "slug" | "title" | "subject_name">[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await getSupabaseBrowser().from("projects").select("slug,title,subject_name").order("created_at", { ascending: false }).limit(50);
      if (!active) return;
      if (error) setError("Impossible de charger les projets. Réessayez.");
      else setProjects(data ?? []);
    }
    void load().catch(() => { if (active) setError("Impossible de charger les projets. Réessayez."); });
    return () => { active = false; };
  }, []);
  if (error) return <p className="notice" role="alert">{error}</p>;
  if (!projects) return <p role="status">Chargement des projets…</p>;
  return <>{!projects.length && <p className="empty">Aucun projet disponible pour le moment.</p>}
    <div className="grid">{projects.map((project) => <article className="card" key={project.slug}>
      <h3>{project.title}</h3><p>{project.subject_name}</p><Link className="button" href={`/p/${project.slug}`}>Ouvrir le projet</Link>
    </article>)}</div></>;
}

export function ProjectList() {
  const { user } = useAuth();
  return <section className="stack"><h2>Les projets</h2><RequireAuth returnTo="/">
    <AuthenticatedProjectList key={user?.id ?? "anonymous"} />
  </RequireAuth></section>;
}
