/* eslint-disable @next/next/no-img-element -- Private signed URLs must bypass public image optimizers. */
"use client";
import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { authenticatedFetch } from "@/lib/api-client";
import { memoryDateLabel } from "@/lib/presentation";
import type { MediaAsset, Memory } from "@/types/database";

function MemoryCard({ memory, media, onOpen }: { memory: Memory; media: MediaAsset[]; onOpen: (memory: Memory) => void }) {
  const ref = useRef<HTMLElement>(null);
  const [url, setUrl] = useState("");
  const photo = media.find(m => m.kind === "image" && !["image/heic", "image/heif"].includes(m.mime_type));
  useEffect(() => {
    if (!photo || !ref.current) return;
    let active = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void authenticatedFetch(`/api/media/${photo.id}`).then(r => r.json()).then(data => { if (active) setUrl(data.url ?? ""); }).catch(() => {});
    }, { rootMargin: "200px" });
    observer.observe(ref.current);
    return () => { active = false; observer.disconnect(); };
  }, [photo]);
  return <article ref={ref} className="card memory-card stack"><span className="paper-pin" aria-hidden="true" />
    {photo && <button className="photo-button" aria-label={`Ouvrir les photos : ${memory.title || "Souvenir"}`} onClick={() => onOpen(memory)}>{/* Reserve image space while the private URL loads, so controls never jump. */}{url ? <img src={url} alt={photo.original_filename || "Photo du souvenir"} loading="lazy" onError={() => setUrl("")} /> : <span className="photo-placeholder muted">Photo du souvenir</span>}</button>}
    <p className="kicker">{memoryDateLabel(memory)}</p><h2><button className="memory-title" onClick={() => onOpen(memory)}>{memory.title || "Souvenir"}</button></h2><p className="message memory-excerpt">{memory.body}</p><strong>{memory.display_name}</strong>
    <button className="link-button" onClick={() => onOpen(memory)}>Ouvrir le souvenir{media.length ? ` · ${media.length} média${media.length > 1 ? "s" : ""}` : ""}</button>
  </article>;
}

export function MemoryCollection({ memories, projectId, timeline, onOpen }: { memories: Memory[]; projectId: string; timeline: boolean; onOpen: (memory: Memory) => void }) {
  const [limit, setLimit] = useState(24);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [error, setError] = useState("");
  const visible = memories.filter(m => !timeline || m.occurred_on || m.year_from || m.year_to).slice(0, limit);
  const ids = visible.map(m => m.id).join(",");
  useEffect(() => {
    if (!ids) return;
    let active = true;
    async function loadMedia() {
      const memoryIds = ids.split(",");
      const collected: MediaAsset[] = [];
      // At most 20 media per memory: 24 IDs stay below PostgREST's 1000-row cap.
      for (let offset = 0; offset < memoryIds.length; offset += 24) {
        const { data, error } = await getSupabaseBrowser().from("media_assets").select("*").eq("project_id", projectId).eq("status", "published").in("memory_id", memoryIds.slice(offset, offset + 24)).order("created_at");
        if (!active) return;
        if (error) throw error;
        collected.push(...data ?? []);
      }
      setMedia(collected); setError("");
    }
    void loadMedia().catch(() => { if (active) setError("Les aperçus des médias sont indisponibles. Ouvrez un souvenir pour réessayer."); });
    return () => { active = false; };
  }, [projectId, ids]);
  const total = memories.filter(m => !timeline || m.occurred_on || m.year_from || m.year_to).length;
  const mediaByMemory = new Map<string, MediaAsset[]>();
  for (const item of media) {
    if (!item.memory_id) continue;
    const group = mediaByMemory.get(item.memory_id) ?? [];
    group.push(item); mediaByMemory.set(item.memory_id, group);
  }
  return <section className="stack">{error && <p className="notice" role="status">{error}</p>}{!total && <p className="empty">{timeline ? "Les souvenirs datés apparaîtront ici." : "Aucun souvenir publié pour le moment."}</p>}
    <div className={timeline ? "timeline album-timeline" : "grid memory-wall"}>{visible.map(memory => <div className={timeline ? "timeline-item" : "wall-item"} key={memory.id}><MemoryCard memory={memory} media={mediaByMemory.get(memory.id) ?? []} onOpen={onOpen} /></div>)}</div>
    {total > limit && <button className="button secondary" onClick={() => setLimit(limit + 24)}>Afficher davantage de souvenirs</button>}
  </section>;
}
