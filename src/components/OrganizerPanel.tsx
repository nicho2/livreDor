"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";
import type { Project, GuestbookEntry, Memory, MediaAsset, PublicationStatus } from "@/types/database";
type Data = { project: Project; entries: GuestbookEntry[]; memories: Memory[]; media: MediaAsset[] };
const labels = { draft: "Brouillon", published: "Publié", hidden: "Masqué" };
export function OrganizerPanel({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<PublicationStatus | "all">("all");
  const [busy, setBusy] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const router = useRouter();
  const url = `/api/projects/${projectId}/admin`;
  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch(url);
      const loaded: Data = await response.json();
      setData(loaded);
      setOpensAt(loaded.project.opens_at?.slice(0, 16) ?? "");
      setClosesAt(loaded.project.closes_at?.slice(0, 16) ?? "");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Chargement impossible."); }
  }, [url]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function act(action: object) {
    setBusy(true); setFeedback("");
    try {
      await authenticatedFetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      setFeedback("Modification enregistrée."); await load(); router.refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Modification impossible."); }
    finally { setBusy(false); }
  }
  async function exportArchive() {
    setBusy(true); setFeedback("Préparation de l'archive et copie des médias…");
    try {
      const response = await authenticatedFetch(`/api/projects/${projectId}/export`, { method: "POST" });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = objectUrl; link.download = `LivreDor-${data?.project.slug ?? projectId}.zip`; link.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      setFeedback("Archive téléchargée. Décompressez-la, puis ouvrez site/index.html. Le dossier archive-privee ne doit pas être publié.");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Export impossible."); }
    finally { setBusy(false); }
  }
  return <section className="stack">
    {feedback && <p role="status" className="notice">{feedback}</p>}
    {!data && <button type="button" className="button secondary" onClick={() => void load()}>Charger l&apos;espace organisateur</button>}
    {data && <>
      <section className="card stack"><h2>Collecte et archivage</h2><p>État : {data.project.status}. Clôturer bloque les contributions mais conserve la consultation et la modération.</p>
        <div className="year-fields"><label>Ouverture (UTC, facultative)<input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label><label>Clôture (UTC, facultative)<input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></label></div>
        <div className="actions">
          {(["open", "closed", "archived"] as const).map((status) => <button className="button secondary" disabled={busy} key={status} onClick={() => {
            if (!window.confirm(`${status === "open" ? "Ouvrir" : status === "closed" ? "Clôturer" : "Archiver"} la collecte avec ces dates ?`)) return;
            void act({ action: "project", status, opensAt: opensAt ? `${opensAt}:00Z` : null, closesAt: closesAt ? `${closesAt}:00Z` : null });
          }}>{status === "open" ? "Ouvrir / enregistrer les dates" : status === "closed" ? "Clôturer" : "Archiver"}</button>)}
          <button className="button" disabled={busy || !["closed", "archived"].includes(data.project.status)} onClick={() => void exportArchive()}>Télécharger l&apos;archive ZIP</button>
        </div><p className="muted">Clôturez avant l&apos;export final. L&apos;archive contient un site autonome avec les seuls contenus publiés et une sauvegarde privée des autres contenus, sans adresses e-mail. L&apos;export ne clôture pas automatiquement le projet.</p>
      </section>
      <label>Filtrer les contenus<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Tous</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {([{ table: "guestbook_entries", title: "Livre d'or", rows: data.entries }, { table: "memories", title: "Souvenirs", rows: data.memories }, { table: "media_assets", title: "Médias", rows: data.media }] as const).map(({ table, title, rows }) => <section className="stack" key={table}><h2>{title} ({rows.length})</h2>
        {rows.filter((row) => filter === "all" || row.status === filter).map((row) => <article className="card stack" key={row.id}>
          <strong>{"display_name" in row ? String(row.display_name) : String(row.original_filename)}</strong>
          <p className="message">{"message" in row ? String(row.message) : "body" in row ? `${row.title ?? "Souvenir"}\n${row.body}` : `${row.kind} · ${row.size_bytes} octets`}</p>
          <span className={`status status-${row.status}`}>{labels[row.status]}</span>
          <div className="actions">{Object.entries(labels).map(([status, label]) => <button type="button" className="button secondary" key={status} disabled={busy || row.status === status} onClick={() => void act({ action: "moderate", table, contentId: row.id, status })}>{label}</button>)}
            {table === "media_assets" && <button className="link-button danger" disabled={busy} onClick={() => { if (window.confirm("Supprimer définitivement le fichier du stockage ? Irréversible.")) void act({ action: "delete-media", contentId: row.id }); }}>Supprimer le fichier</button>}
          </div>
        </article>)}
      </section>)}
    </>}
  </section>;
}
