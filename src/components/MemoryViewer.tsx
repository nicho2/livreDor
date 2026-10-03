"use client";
import { useEffect, useRef } from "react";
import { memoryDateLabel } from "@/lib/presentation";
import { MediaGallery } from "@/components/MediaGallery";
import type { Memory } from "@/types/database";

export function MemoryDetail({ memory, projectId }: { memory: Memory; projectId: string }) {
  return <article className="stack memory-detail"><p className="kicker">{memoryDateLabel(memory)}</p><h1 id="memory-title">{memory.title || "Souvenir"}</h1><strong>{memory.display_name}</strong><p className="muted small">Publié le {new Date(memory.created_at).toLocaleDateString("fr-FR")}</p><p className="message">{memory.body}</p><MediaGallery projectId={projectId} memoryId={memory.id} /></article>;
}
export function MemoryViewer({ memory, projectId, onClose }: { memory: Memory; projectId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; const previous = document.activeElement as HTMLElement | null; el?.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { el?.close(); document.body.style.overflow = overflow; previous?.focus(); }; }, []);
  return <dialog ref={dialog} className="memory-viewer" aria-labelledby="memory-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><button className="button secondary viewer-close" autoFocus onClick={onClose}>Fermer ✕</button><MemoryDetail memory={memory} projectId={projectId} /></dialog>;
}
