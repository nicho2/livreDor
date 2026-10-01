"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { guestbookEntrySchema } from "@/lib/validators";
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
  const [entryId, setEntryId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEntry() {
      const supabase = getSupabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data } = await supabase
        .from("guestbook_entries")
        .select("id, display_name, message, formatting")
        .eq("project_id", projectId)
        .eq("author_id", auth.user.id)
        .maybeSingle();

      if (!active || !data) return;
      setEntryId(data.id);
      setDisplayName(data.display_name);
      setMessage(data.message);
      setFormatting(data.formatting);
    }

    void loadEntry();
    return () => {
      active = false;
    };
  }, [projectId]);

  async function submit(event: FormEvent, status: "draft" | "published") {
    event.preventDefault();
    setBusy(true);
    setFeedback("");

    const parsed = guestbookEntrySchema.safeParse({ displayName, message, formatting });
    if (!parsed.success) {
      setBusy(false);
      setFeedback("Vérifiez votre nom, votre message et sa mise en forme.");
      return;
    }

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

    const values = {
      display_name: parsed.data.displayName,
      message: parsed.data.message,
      formatting: parsed.data.formatting,
      status,
    };

    const { data, error } = entryId
      ? await supabase.from("guestbook_entries").update(values).eq("id", entryId).select("id").single()
      : await supabase
          .from("guestbook_entries")
          .insert({ ...values, project_id: projectId, author_id: auth.user.id })
          .select("id")
          .single();

    setBusy(false);
    if (error) return setFeedback(error.message);
    setEntryId(data.id);
    setFeedback(status === "published" ? "Votre message est publié." : "Votre brouillon est enregistré.");
  }

  return (
    <form className="card stack" onSubmit={(event) => submit(event, "published")}>
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
      <div className="actions">
        <button className="button" disabled={busy}>{busy ? "Enregistrement…" : entryId ? "Mettre à jour et publier" : "Publier mon message"}</button>
        <button className="button secondary" type="button" disabled={busy} onClick={(event) => void submit(event as unknown as FormEvent, "draft")}>Enregistrer en brouillon</button>
      </div>
      {feedback && <p className="notice">{feedback}</p>}
    </form>
  );
}
