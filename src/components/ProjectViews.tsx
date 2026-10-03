"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "@/components/ProjectAccess";
import { MemoryDetail, MemoryViewer } from "@/components/MemoryViewer";
import { GuestBook } from "@/components/GuestBook";
import { MemoryCollection } from "@/components/MemoryCollection";
import { AlbumCover } from "@/components/AlbumCover";
import { ContributionForm } from "@/components/ContributionForm";
import { MemoryManager } from "@/components/MemoryManager";
import { ContributionNameProvider } from "@/components/ContributionNameProvider";
import { OrganizerPanel } from "@/components/OrganizerPanel";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { chronologicalMemories, memoryDateLabel, projectWindow } from "@/lib/presentation";
import type { GuestbookEntry, Memory } from "@/types/database";

export function ProjectOverview() {
  const project = useProject();
  return <main><section className="hero hero-album">
    <AlbumCover />
    <p className="kicker">Pour {project.subject_name}</p><h1>{project.title}</h1>
    {project.description && <p>{project.description}</p>}
    {project.event_date && <p>Date de l&apos;événement : {memoryDateLabel({ occurred_on: project.event_date, year_from: null, year_to: null })}</p>}
    <div className="actions">
      <Link className="button" href={`/p/${project.slug}/contribute`}>Laisser un message</Link>
      <Link className="button secondary" href={`/p/${project.slug}/guestbook`}>Lire le livre d’or</Link>
      <Link className="button secondary" href={`/p/${project.slug}/wall`}>Voir le mur</Link>
      <Link className="button secondary" href={`/p/${project.slug}/timeline`}>Chronologie</Link>
    </div>
  </section><section className="grid album-navigation" aria-label="Parcourir l’album">
    <Link className="card" href={`/p/${project.slug}/guestbook`}><span className="album-symbol" aria-hidden="true">✎</span><h2>Les mots de chacun</h2><p>Un livre à parcourir, des mots à garder.</p></Link>
    <Link className="card" href={`/p/${project.slug}/wall`}><span className="album-symbol" aria-hidden="true">▧</span><h2>Nos souvenirs partagés</h2><p>Photos, anecdotes et petits moments précieux.</p></Link>
    <Link className="card" href={`/p/${project.slug}/timeline`}><span className="album-symbol" aria-hidden="true">↝</span><h2>Le fil de notre histoire</h2><p>Retrouver les moments au fil des années.</p></Link>
  </section></main>;
}

export function PublishedView({ view, memoryId }: { view: "guestbook" | "wall" | "timeline" | "memory"; memoryId?: string }) {
  const project = useProject();
  const [content, setContent] = useState<{ entries: GuestbookEntry[]; memories: Memory[] } | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Memory | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const db = getSupabaseBrowser();
        let query = db.from("memories").select("*").eq("project_id", project.id).eq("status", "published");
        if (view === "memory") query = query.eq("id", memoryId ?? "");
        const [memories, entries] = await Promise.all([
          view === "guestbook" ? Promise.resolve({ data: [], error: null }) : query,
          view === "guestbook" ? db.from("guestbook_entries").select("*").eq("project_id", project.id).eq("status", "published").order("created_at", { ascending: false }).order("id") : Promise.resolve({ data: [], error: null }),
        ]);
        if (memories.error || entries.error) throw new Error(view === "guestbook" ? "Impossible de charger les messages. Réessayez." : "Impossible de charger les souvenirs. Réessayez.");
        if (view === "memory" && !memories.data?.length) throw new Error("Souvenir introuvable ou accès refusé.");
        if (active) setContent({ entries: entries.data ?? [], memories: chronologicalMemories(memories.data ?? []) });
      } catch (error) { if (active) setError(error instanceof Error ? error.message : "Chargement impossible."); }
    }
    void load();
    return () => { active = false; };
  }, [project.id, view, memoryId]);
  if (error) return <p className="notice" role="alert">{error}</p>;
  if (!content) return <p className="notice" role="status">{view === "guestbook" ? "Chargement des messages…" : "Chargement des souvenirs…"}</p>;
  const { entries, memories } = content;
  if (view === "guestbook") return <main className="stack">
    <div><p className="kicker">Livre d’or</p><h1>Les messages pour {project.subject_name}</h1><p className="muted">Les mots de chacun, réunis dans le livre d’or.</p></div>
    <GuestBook entries={entries} />
    <div className="actions"><Link className="button" href={`/p/${project.slug}/contribute`}>Laisser un message</Link></div>
  </main>;
  if (view === "memory") {
    const memory = memories[0];
    return <main className="stack"><div className="card"><MemoryDetail memory={memory} projectId={project.id} /></div><Link href={`/p/${project.slug}/wall`}>Retour au mur des souvenirs</Link></main>;
  }
  return <main className="stack">
    <div><p className="kicker">{view === "timeline" ? "Chronologie" : "Mur des souvenirs"}</p><h1>{view === "timeline" ? `L’histoire de ${project.subject_name}` : project.subject_name}</h1><p className="muted">Des instants partagés, une histoire qui nous ressemble.</p></div>
    <MemoryCollection memories={memories} projectId={project.id} timeline={view === "timeline"} onOpen={setSelected} />
    {selected && <MemoryViewer memory={selected} projectId={project.id} onClose={() => setSelected(null)} />}
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
