"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";
import { useProjectUpdate } from "@/components/ProjectAccess";
import type { Project, GuestbookEntry, Memory, MediaAsset, PublicationStatus } from "@/types/database";
type Data = { project: Project; entries: GuestbookEntry[]; memories: Memory[]; media: MediaAsset[]; invitation: { email: string; accepted_by: string | null } | null; sharingReady: boolean };
const labels = { draft: "Brouillon", published: "Publié", hidden: "Masqué" };
export function OrganizerPanel({ projectId }: { projectId: string }) {
  const updateProject = useProjectUpdate();
  const [data, setData] = useState<Data | null>(null);
  const [feedback, setFeedback] = useState("");
  const [filter, setFilter] = useState<PublicationStatus | "all">("all");
  const [busy, setBusy] = useState(false);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const router = useRouter();
  const url = `/api/projects/${projectId}/admin`;
  const load = useCallback(async () => {
    try {
      const response = await authenticatedFetch(url);
      const loaded: Data = await response.json();
      setData(loaded);
      // Keep the layout's title/window in sync after organizer edits; a server
      // refresh alone cannot reload data held by the authenticated client layout.
      updateProject(loaded.project);
      setOpensAt(loaded.project.opens_at?.slice(0, 16) ?? "");
      setClosesAt(loaded.project.closes_at?.slice(0, 16) ?? "");
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Chargement impossible."); }
  }, [url, updateProject]);
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
      <ProjectDetailsForm disabled={busy} initial={{ title: data.project.title, subjectName: data.project.subject_name, description: data.project.description ?? "", eventDate: data.project.event_date ?? "" }} onSave={async (details) => {
        // Unlike moderation, propagate errors so the form cannot report a false success.
        setBusy(true); setFeedback("");
        try {
          await authenticatedFetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "details", ...details }) });
          await load(); router.refresh();
        } finally { setBusy(false); }
      }} />
      <section className="card stack"><h2>Partager l&apos;organisation</h2>
        <p>Invitez une deuxième personne à modérer, clôturer et exporter ce LivreDor. Elle doit ouvrir le lien du projet et se connecter avec le code envoyé à cette adresse. Aucun email d&apos;invitation n&apos;est envoyé automatiquement.</p>
        {!data.sharingReady && <p className="notice">Appliquez la migration Supabase 0005 pour activer ce partage.</p>}
        {data.invitation && <p role="status">{data.invitation.accepted_by ? "Deuxième organisateur : " : "Invitation en attente : "}{data.invitation.email}</p>}
        <form className="stack" onSubmit={(event) => { event.preventDefault(); void act({ action: "invite-organizer", email: organizerEmail }); }}>
          <label>Email du deuxième organisateur<input type="email" required maxLength={254} value={organizerEmail} onChange={(event) => setOrganizerEmail(event.target.value)} disabled={busy || !data.sharingReady || !!data.invitation?.accepted_by} /></label>
          <div className="actions"><button type="submit" className="button secondary" disabled={busy || !data.sharingReady || !!data.invitation?.accepted_by}>Inviter le deuxième organisateur</button>
            {data.invitation && !data.invitation.accepted_by && <button type="button" className="button secondary" disabled={busy} onClick={() => void act({ action: "cancel-invitation" })}>Annuler l&apos;invitation</button>}
          </div>
          <p className="muted">Une nouvelle adresse remplace l&apos;invitation encore en attente. L&apos;adresse reste privée, hors du mur et de l&apos;archive exportée. Les deux organisateurs disposent des mêmes droits.</p>
        </form>
        <p className="message">Lien à transmettre : /p/{data.project.slug}</p>
      </section>
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
