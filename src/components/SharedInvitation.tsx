"use client";
import { useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";

export function SharedInvitation({ projectId, disabled }: { projectId: string; disabled: boolean }) {
  const [link, setLink] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  async function prepare(renew = false) {
    if (renew && !window.confirm("Renouveler le lien ? L’ancien lien ne permettra plus de rejoindre le projet. Les membres déjà inscrits conserveront leur accès.")) return;
    setBusy(true); setFeedback("");
    try {
      const response = await authenticatedFetch(`/api/projects/${projectId}/invitation`, { method: renew ? "PATCH" : "POST" });
      const data: { path: string } = await response.json();
      const url = `${window.location.origin}${data.path}`;
      setLink(url);
      try {
        await navigator.clipboard.writeText(url);
        setFeedback(renew ? "Nouveau lien copié. L’ancien lien est désactivé." : "Lien d’invitation copié.");
      } catch { setFeedback("Le lien est prêt. Copiez-le depuis le champ ci-dessous."); }
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Invitation indisponible."); }
    finally { setBusy(false); }
  }
  return <section className="card stack"><h2>Inviter les participants</h2>
    <p>Transmettez le même lien à tout le groupe. Chaque personne se connecte par code email et retrouve ensuite ce projet dans « Mes projets », même sans avoir contribué. Toute personne recevant ce lien peut rejoindre la collecte ouverte.</p>
    <div className="actions"><button className="button" disabled={disabled || busy} onClick={() => void prepare()}>Copier le lien d’invitation</button>
      <button className="button secondary" disabled={disabled || busy} onClick={() => void prepare(true)}>Renouveler le lien</button></div>
    {link && <label>Lien à transmettre<input readOnly value={link} onFocus={event => event.target.select()} /></label>}
    {feedback && <p role="status">{feedback}</p>}
    <p className="muted">Après clôture, aucune nouvelle adhésion par ce lien. Les membres existants conservent leur accès. Renouveler le lien conserve également leurs droits.</p>
  </section>;
}
