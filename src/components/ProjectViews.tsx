"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "@/components/ProjectAccess";
import { MediaGallery } from "@/components/MediaGallery";
import { ContributionForm } from "@/components/ContributionForm";
import { MemoryManager } from "@/components/MemoryManager";
import { ContributionNameProvider } from "@/components/ContributionNameProvider";
import { OrganizerPanel } from "@/components/OrganizerPanel";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { chronologicalMemories, formattingClasses, memoryDateLabel, projectWindow } from "@/lib/presentation";
import type { GuestbookEntry, Memory } from "@/types/database";

export function ProjectOverview() {
  const project = useProject();
  return <main><section className="hero">
    <p className="kicker">Pour {project.subject_name}</p><h1>{project.title}</h1>
    {project.description && <p>{project.description}</p>}
    {project.event_date && <p>Date de l&apos;événement : {memoryDateLabel({ occurred_on: project.event_date, year_from: null, year_to: null })}</p>}
    <div className="actions">
      <Link className="button" href={`/p/${project.slug}/contribute`}>Laisser un message</Link>
      <Link className="button secondary" href={`/p/${project.slug}/wall`}>Voir le mur</Link>
      <Link className="button secondary" href={`/p/${project.slug}/timeline`}>Chronologie</Link>
    </div>
  </section></main>;
}

export function PublishedView({ view, memoryId }: { view: "wall" | "timeline" | "memory"; memoryId?: string }) {
  const project = useProject();
  const [content, setContent] = useState<{ entries: GuestbookEntry[]; memories: Memory[] } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const db = getSupabaseBrowser();
        let query = db.from("memories").select("*").eq("project_id", project.id).eq("status", "published");
        if (view === "memory") query = query.eq("id", memoryId ?? "");
        const [memories, entries] = await Promise.all([
          query,
          view === "wall" ? db.from("guestbook_entries").select("*").eq("project_id", project.id).eq("status", "published").order("created_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
        ]);
        if (memories.error || entries.error) throw new Error("Impossible de charger les souvenirs. Réessayez.");
        if (view === "memory" && !memories.data?.length) throw new Error("Souvenir introuvable ou accès refusé.");
        if (active) setContent({ entries: entries.data ?? [], memories: chronologicalMemories(memories.data ?? []) });
      } catch (error) { if (active) setError(error instanceof Error ? error.message : "Chargement impossible."); }
    }
    void load();
    return () => { active = false; };
  }, [project.id, view, memoryId]);
  if (error) return <p className="notice" role="alert">{error}</p>;
  if (!content) return <p className="notice" role="status">Chargement des souvenirs…</p>;
  const { entries, memories } = content;
  if (view === "memory") {
    const memory = memories[0];
    return <main className="stack"><article className="card stack">
      <p className="kicker">{memoryDateLabel(memory)}</p><h1>{memory.title || "Souvenir"}</h1>
      <p className="message">{memory.body}</p><strong>{memory.display_name}</strong>
      <MediaGallery projectId={project.id} memoryId={memory.id} />
    </article><Link href={`/p/${project.slug}/wall`}>Retour au mur des souvenirs</Link></main>;
  }
  if (view === "timeline") return <main className="stack">
    <div><p className="kicker">Chronologie</p><h1>L&apos;histoire de {project.subject_name}</h1></div>
    {!memories.length && <div className="empty">Les souvenirs datés apparaîtront ici.</div>}
    <section className="timeline">{memories.map((memory) => <article className="timeline-item" key={memory.id}>
      <strong>{memoryDateLabel(memory)}</strong><h2><Link href={`/p/${project.slug}/memories/${memory.id}`}>{memory.title || "Souvenir"}</Link></h2>
      <p className="message">{memory.body}</p><span className="muted">{memory.display_name}</span>
    </article>)}</section>
  </main>;
  return <main className="stack">
    <div><p className="kicker">Mur des souvenirs</p><h1>{project.subject_name}</h1></div>
    {!entries.length && !memories.length && <div className="empty">Aucun contenu publié pour le moment.</div>}
    <section className="grid">
      {entries.map((entry) => <article className="card" key={entry.id}><p className={formattingClasses(entry.formatting)}>{entry.message}</p><strong>{entry.display_name}</strong></article>)}
      {memories.map((memory) => <article className="card stack" key={memory.id}>
        <p className="kicker">{memoryDateLabel(memory)}</p><h2><Link href={`/p/${project.slug}/memories/${memory.id}`}>{memory.title || "Souvenir"}</Link></h2>
        <p className="message">{memory.body}</p><strong>{memory.display_name}</strong><MediaGallery projectId={project.id} memoryId={memory.id} />
      </article>)}
    </section>
  </main>;
}

export function ProjectContribution() {
  const project = useProject();
  const { closed, future } = projectWindow(project);
  return <main className="stack">
    <div><p className="kicker">Contribution</p><h1>{project.subject_name}</h1><p className="muted">Commencez par votre message. Les souvenirs et médias viennent ensuite.</p></div>
    <fieldset className="contribution-fields" disabled={closed || future}>
      <ContributionNameProvider key={project.id} projectId={project.id}>
        <ContributionForm projectId={project.id} /><MemoryManager projectId={project.id} />
      </ContributionNameProvider>
    </fieldset>
  </main>;
}

export function ProjectOrganization() {
  const project = useProject();
  return <main className="stack"><div><p className="kicker">Administration</p><h1>{project.title}</h1></div><OrganizerPanel projectId={project.id} /></main>;
}
