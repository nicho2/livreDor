import type { Project, GuestbookEntry, Memory, MediaAsset } from "@/types/database";
import { chronologicalMemories, formattingClasses, memoryDateLabel } from "./presentation";
import { resolveTheme, themeCss } from "./themes";
export type ArchiveData = { project: Project; entries: GuestbookEntry[]; memories: Memory[]; media: MediaAsset[] };
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
export function archiveMediaPath(media: MediaAsset) {
  const extension = media.original_filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `media/${media.kind}/${media.id}.${extension}`;
}
export function renderStaticSite(data: ArchiveData, availableMedia: Set<string>) {
  const h = escapeHtml;
  const theme = resolveTheme(data.project.theme);
  const eventDate = data.project.event_date ? `<p>Date de l'événement : ${h(memoryDateLabel({ occurred_on: data.project.event_date, year_from: null, year_to: null }))}</p>` : "";
  const published = chronologicalMemories(data.memories.filter((m) => m.status === "published"));
  const dated = published.filter(m => m.occurred_on || m.year_from || m.year_to);
  // Index once: an album with hundreds of memories must not rescan all media per card.
  const mediaByMemory = new Map<string, MediaAsset[]>();
  for (const item of data.media) {
    if (!item.memory_id || item.status !== "published" || !availableMedia.has(item.id)) continue;
    const group = mediaByMemory.get(item.memory_id) ?? [];
    group.push(item); mediaByMemory.set(item.memory_id, group);
  }
  const attachments = (memoryId: string) => (mediaByMemory.get(memoryId) ?? []).map((m) => {
    const path = h(archiveMediaPath(m)), label = h(m.original_filename);
    let player = "";
    if (m.kind === "image" && !["image/heic", "image/heif"].includes(m.mime_type)) player = `<img loading="lazy" src="${path}" alt="${label}">`;
    if (m.kind === "video") player = `<video controls preload="metadata" src="${path}"></video>`;
    if (m.kind === "audio") player = `<audio controls preload="metadata" src="${path}"></audio>`;
    return `<figure>${player}<figcaption><a href="${path}" download>${label}</a></figcaption></figure>`;
  }).join("");
  const memory = (m: Memory) => `<article class="card" id="souvenir-${h(m.id)}"><p class="kicker">${h(memoryDateLabel(m))}</p><h3>${h(m.title || "Souvenir")}</h3><p class="message">${h(m.body)}</p><strong>${h(m.display_name)}</strong>${attachments(m.id)}</article>`;
  const entries = data.entries.filter((e) => e.status === "published").map((e) => `<article class="card"><p class="${formattingClasses(e.formatting)}">${h(e.message)}</p><strong>${h(e.display_name)}</strong></article>`).join("");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${h(data.project.title)}</title><link rel="stylesheet" href="assets/app.css"><style>:root{${themeCss(theme)}}body{background:var(--bg);color:var(--ink)}.card{background:var(--paper);border-radius:var(--radius)}a,.kicker{color:var(--accent)}</style></head><body data-theme="${theme}"><main class="shell"><header><h1>${h(data.project.title)}</h1><p>${h(data.project.subject_name)}</p><p class="message">${h(data.project.description)}</p>${eventDate}<nav><a href="#livre">Livre d'or</a> · <a href="#mur">Mur des souvenirs</a> · <a href="#chronologie">Chronologie</a></nav></header><section id="livre"><h2>Livre d'or</h2><div class="grid">${entries || "<p>Aucun message publié.</p>"}</div></section><section id="mur"><h2>Mur des souvenirs</h2><div class="grid">${published.map(memory).join("") || "<p>Aucun souvenir publié.</p>"}</div></section><section id="chronologie"><h2>Chronologie</h2><ol>${dated.map((m) => `<li><a href="#souvenir-${h(m.id)}">${h(memoryDateLabel(m))} — ${h(m.title || "Souvenir")}</a> · ${h(m.display_name)}</li>`).join("")}</ol></section><footer>LivreDor — archive autonome. Aucun compte ni connexion Internet nécessaire.</footer></main></body></html>`;
}
export const archiveCss = `*{box-sizing:border-box}body{margin:0;background:#f6f3ee;color:#29251f;font:16px/1.6 Arial,sans-serif}.shell{max-width:1100px;margin:auto;padding:24px}section{margin:40px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px}.card{background:white;border:1px solid #ded8cf;border-radius:16px;padding:24px;min-width:0}a{color:#6f4e37}.message{white-space:pre-wrap;overflow-wrap:anywhere}h1,h2,h3{overflow-wrap:anywhere}.kicker{color:#6f4e37}figure{margin:16px 0}img,video,audio{max-width:100%;max-height:480px}figcaption{overflow-wrap:anywhere}.font-serif{font-family:Georgia,serif}.font-hand{font-family:'Segoe Print',cursive}.font-mono{font-family:monospace}.size-sm{font-size:.9rem}.size-lg{font-size:1.25rem}.align-center{text-align:center}.align-right{text-align:right}.color-blue{color:#23548b}.color-green{color:#28613b}.color-burgundy{color:#832d43}.color-gold{color:#775314}.weight-bold{font-weight:700}.style-italic{font-style:italic}:focus-visible{outline:3px solid #23548b}footer{margin-top:40px}`;
export const archiveReadme = `LivreDor — archive autonome\n\nDécompressez entièrement le ZIP. Ouvrez site/index.html dans un navigateur.\nLe dossier site/ contient uniquement les contenus publiés et leurs médias.\nIl fonctionne localement, sans Supabase, R2 ou JavaScript.\nNe publiez que site/, avec l'accord des personnes concernées.\n\nATTENTION : archive-privee/ est réservé à l'organisateur.\nIl contient également les brouillons et contenus masqués, sans adresses e-mail.\nNe publiez jamais ce dossier ni le ZIP complet.\nLes fichiers supprimés physiquement et les uploads inachevés ne sont pas récupérables.\nConsultez archive-privee/data/media-manifest.json pour les fichiers absents.\nLes UUID sont des identifiants techniques, pas des adresses e-mail.\nConservez le ZIP dans un emplacement privé, avec une durée de conservation adaptée.\n`;
