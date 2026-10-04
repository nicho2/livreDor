"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "@/lib/api-client";
import { projectDeletionAllowed } from "@/lib/project-deletion";
import type { Project } from "@/types/database";
export function ProjectDangerZone({ project, disabled, onRefresh }: { project: Project; disabled: boolean; onRefresh: () => Promise<void> }) {
  const [confirmation, setConfirmation] = useState("");
  const [archiveSaved, setArchiveSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const allowed = projectDeletionAllowed(project);
  return <section className="danger-zone stack" aria-labelledby="danger-zone-title"><h2 id="danger-zone-title">Zone de danger</h2>
    <p>Supprimer définitivement ce projet efface ses messages, souvenirs, médias R2, membres et invitations. Les comptes des participants et les autres projets sont conservés. Cette action est irréversible.</p>
    {!allowed && <p>Pour activer la suppression : clôturez la collecte, téléchargez l&apos;archive ZIP puis archivez le projet.</p>}
    {project.deletion_started_at && <p role="status">Le nettoyage a commencé. Le projet est bloqué ; reprenez la suppression pour terminer le nettoyage et l&apos;effacement.</p>}
    <form className="stack" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        await authenticatedFetch(`/api/projects/${project.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation, archiveSaved }) });
        router.replace("/");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Suppression impossible. Réessayez.");
        await onRefresh();
      } finally { setBusy(false); }
    }}>
      <label className="checkbox-label"><input type="checkbox" checked={archiveSaved} disabled={!allowed || disabled || busy} onChange={event => setArchiveSaved(event.target.checked)} />J&apos;ai enregistré et vérifié l&apos;archive ZIP sur mon ordinateur.</label>
      <label>Pour confirmer, recopiez « {project.slug} »<input autoComplete="off" value={confirmation} disabled={!allowed || disabled || busy} onChange={event => setConfirmation(event.target.value)} /></label>
      <button type="submit" className="button destructive" disabled={!allowed || disabled || busy || !archiveSaved || confirmation !== project.slug}>{busy ? "Suppression en cours…" : project.deletion_started_at ? "Reprendre la suppression définitive" : "Supprimer définitivement le projet"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </section>;
}
