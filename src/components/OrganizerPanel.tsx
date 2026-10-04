"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";
import { ProjectDetailsForm } from "@/components/ProjectDetailsForm";
import { ThemeSelector } from "@/components/ThemeSelector";
import { ProjectDangerZone } from "@/components/ProjectDangerZone";
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
  const [archiveUrl, setArchiveUrl] = useState("");
  const [pendingStatus, setPendingStatus] = useState<"open" | "closed" | "archived" | null>(null);
  useEffect(() => {
    if (!archiveUrl) return;
    return () => URL.revokeObjectURL(archiveUrl);
  }, [archiveUrl]);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const blocked = busy || !!data?.project.deletion_started_at;
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
    setArchiveUrl("");
    setBusy(true); setFeedback("Préparation de l'archive et copie des médias…");
    try {
      const response = await authenticatedFetch(`/api/projects/${projectId}/export`, { method: "POST" });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setArchiveUrl(objectUrl);
      const link = document.createElement("a"); link.href = objectUrl; link.download = `LivreDor-${data?.project.slug ?? projectId}.zip`; link.click();
      setFeedback("Archive prête. Si le téléchargement ne démarre pas, utilisez le lien ci-dessous. Décompressez-la, puis ouvrez site/index.html. Le dossier archive-privee ne doit pas être publié.");
      await load();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Export impossible."); }
    finally { setBusy(false); }
  }
  return <section className="stack">
    {feedback && <p role="status" className="notice">{feedback}</p>}
    {!data && <button type="button" className="button secondary" onClick={() => void load()}>Charger l&apos;espace organisateur</button>}
    {data && <>
      <ThemeSelector key={data.project.theme ?? "album"} current={data.project.theme} disabled={blocked || !!data.project.deletion_started_at} onSave={theme => act({ action: "theme", theme })} />
      <ProjectDetailsForm disabled={blocked} initial={{ title: data.project.title, subjectName: data.project.subject_name, description: data.project.description ?? "", eventDate: data.project.event_date ?? "" }} onSave={async (details) => {
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
          <label>Email du deuxième organisateur<input type="email" required maxLength={254} value={organizerEmail} onChange={(event) => setOrganizerEmail(event.target.value)} disabled={blocked || !data.sharingReady || !!data.invitation?.accepted_by} /></label>
          <div className="actions"><button type="submit" className="button secondary" disabled={blocked || !data.sharingReady || !!data.invitation?.accepted_by}>Inviter le deuxième organisateur</button>
            {data.invitation && !data.invitation.accepted_by && <button type="button" className="button secondary" disabled={blocked} onClick={() => void act({ action: "cancel-invitation" })}>Annuler l&apos;invitation</button>}
          </div>
          <p className="muted">Une nouvelle adresse remplace l&apos;invitation encore en attente. L&apos;adresse reste privée, hors du mur et de l&apos;archive exportée. Les deux organisateurs disposent des mêmes droits.</p>
        </form>
        <p className="message">Lien à transmettre : /p/{data.project.slug}</p>
      </section>
      <section className="card stack"><h2>Collecte et sauvegarde</h2><p>État : {{ open: "Collecte ouverte", closed: "Collecte clôturée", archived: "Projet archivé", draft: "Brouillon" }[data.project.status] ?? data.project.status}.</p>
        <ol className="stack">
          <li><strong>Clôturer la collecte</strong> bloque les nouvelles contributions. Le projet reste consultable.</li>
          <li><strong>Préparer et télécharger le ZIP</strong> crée la sauvegarde sur votre ordinateur. Décompressez-la et vérifiez son contenu.</li>
          <li><strong>Archiver le projet</strong> marque le projet comme terminé dans LivreDor. Cela ne télécharge ni ne supprime aucun fichier.</li>
        </ol>
        <div className="year-fields"><label>Ouverture (UTC, facultative)<input type="datetime-local" disabled={blocked} value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label><label>Clôture (UTC, facultative)<input type="datetime-local" disabled={blocked} value={closesAt} onChange={(e) => setClosesAt(e.target.value)} /></label></div>
        <div className="actions">
          {(["open", "closed", "archived"] as const).map((status) => <button className="button secondary" disabled={blocked || !!data.project.deletion_started_at || (status === "archived" && (!data.project.archive_exported_at || !["closed", "archived"].includes(data.project.status)))} key={status} onClick={() => setPendingStatus(status)}>{status === "open" ? "Ouvrir / enregistrer les dates" : status === "closed" ? "Clôturer" : "Archiver le projet"}</button>)}
          <button className="button" disabled={blocked || !!data.project.deletion_started_at || !["closed", "archived"].includes(data.project.status)} onClick={() => void exportArchive()}>Préparer et télécharger le ZIP</button>
        </div>
        {archiveUrl && <p>Le ZIP est prêt. Si le téléchargement automatique n&apos;a pas démarré : <a href={archiveUrl} download={`LivreDor-${data.project.slug}.zip`}>Télécharger à nouveau le même ZIP</a>. Ce lien ne crée pas une nouvelle sauvegarde.</p>}
        {pendingStatus && <div className="notice stack" role="group" aria-label="Confirmer le changement de collecte"><p>{pendingStatus === "open" ? "Ouvrir la collecte avec ces dates ?" : pendingStatus === "closed" ? "Clôturer la collecte avec ces dates ?" : "Avez-vous enregistré et vérifié le ZIP ? Confirmez l'archivage."}</p><div className="actions"><button className="button" disabled={blocked} onClick={() => { const status = pendingStatus; setPendingStatus(null); void act({ action: "project", status, opensAt: opensAt ? `${opensAt}:00Z` : null, closesAt: closesAt ? `${closesAt}:00Z` : null }); }}>Confirmer</button><button className="button secondary" disabled={blocked} onClick={() => setPendingStatus(null)}>Annuler</button></div></div>}
        <p className="muted">Clôturez, téléchargez et vérifiez le ZIP, puis archivez le projet. L&apos;archive contient un site autonome avec les seuls contenus publiés et une sauvegarde privée des autres contenus, sans adresses e-mail. Toute modification des contenus ou du thème nécessite un nouvel export avant suppression.</p>
      </section>
      <label>Filtrer les contenus<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Tous</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {([{ table: "guestbook_entries", title: "Livre d'or", rows: data.entries }, { table: "memories", title: "Souvenirs", rows: data.memories }, { table: "media_assets", title: "Médias", rows: data.media }] as const).map(({ table, title, rows }) => <section className="stack" key={table}><h2>{title} ({rows.length})</h2>
        {rows.filter((row) => filter === "all" || row.status === filter).map((row) => <article className="card stack" key={row.id}>
          <strong>{"display_name" in row ? String(row.display_name) : String(row.original_filename)}</strong>
          <p className="message">{"message" in row ? String(row.message) : "body" in row ? `${row.title ?? "Souvenir"}\n${row.body}` : `${row.kind} · ${row.size_bytes} octets`}</p>
          <span className={`status status-${row.status}`}>{labels[row.status]}</span>
          <div className="actions">{Object.entries(labels).map(([status, label]) => <button type="button" className="button secondary" key={status} disabled={blocked || row.status === status} onClick={() => void act({ action: "moderate", table, contentId: row.id, status })}>{label}</button>)}
            {table === "media_assets" && <button className="link-button danger" disabled={blocked} onClick={() => { if (window.confirm("Supprimer définitivement le fichier du stockage ? Irréversible.")) void act({ action: "delete-media", contentId: row.id }); }}>Supprimer le fichier</button>}
          </div>
        </article>)}
      </section>)}
      <ProjectDangerZone project={data.project} disabled={busy} onRefresh={load} />
    </>}
  </section>;
}
