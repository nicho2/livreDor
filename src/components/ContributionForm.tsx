"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { GuestbookFormatting } from "@/types/database";

const defaultFormatting: GuestbookFormatting = {
  font: "sans",
  size: "md",
  align: "left",
  color: "ink",
  bold: false,
  italic: false,
};

export function ContributionForm({ projectId }: { projectId: string }) {
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [formatting, setFormatting] = useState(defaultFormatting);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");

    const supabase = getSupabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      setFeedback("Connectez-vous avant de déposer un message.");
      return;
    }

    const { error: joinError } = await supabase.rpc("join_project", { p_project_id: projectId });
    if (joinError) {
      setBusy(false);
      setFeedback(joinError.message);
      return;
    }

    const { error } = await supabase.from("guestbook_entries").insert({
      project_id: projectId,
      author_id: auth.user.id,
      display_name: displayName.trim(),
      message: message.trim(),
      formatting,
      status: "published",
    });

    setBusy(false);
    if (error) return setFeedback(error.message);
    setMessage("");
    setFeedback("Votre message a été enregistré.");
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <h2>Votre message</h2>
      <label>Nom affiché<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} required /></label>
      <div className="format-bar">
        <select value={formatting.font} onChange={(e) => setFormatting({ ...formatting, font: e.target.value as GuestbookFormatting["font"] })} aria-label="Police">
          <option value="sans">Simple</option><option value="serif">Élégante</option><option value="hand">Manuscrite</option><option value="mono">Machine</option>
        </select>
        <select value={formatting.size} onChange={(e) => setFormatting({ ...formatting, size: e.target.value as GuestbookFormatting["size"] })} aria-label="Taille">
          <option value="sm">Petit</option><option value="md">Normal</option><option value="lg">Grand</option>
        </select>
        <button type="button" className={formatting.bold ? "toggle active" : "toggle"} onClick={() => setFormatting({ ...formatting, bold: !formatting.bold })}>G</button>
        <button type="button" className={formatting.italic ? "toggle active" : "toggle"} onClick={() => setFormatting({ ...formatting, italic: !formatting.italic })}><em>I</em></button>
      </div>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} maxLength={5000} placeholder="Écrivez votre message…" required />
      <p className="muted small">Vous pourrez ensuite ajouter un ou plusieurs souvenirs.</p>
      <button className="button" disabled={busy}>{busy ? "Enregistrement…" : "Publier mon message"}</button>
      {feedback && <p className="notice">{feedback}</p>}
    </form>
  );
}
