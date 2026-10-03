"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { guestbookEntrySchema } from "@/lib/validators";
import type { GuestbookFormatting } from "@/types/database";
import { useContributionName } from "@/components/ContributionNameProvider";
import { GuestBookPage } from "@/components/GuestBook";
import { resolveDisplayName } from "@/lib/display-name";

const defaultFormatting: GuestbookFormatting = {
  font: "sans",
  size: "md",
  align: "left",
  color: "ink",
  bold: false,
  italic: false,
};

export function ContributionForm({ projectId }: { projectId: string }) {
  // A late initial fetch must never replace text/formatting already edited locally.
  const edited = useRef(false);
  const { suggestedName, rememberName } = useContributionName();
  const [loaded, setLoaded] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [formatting, setFormatting] = useState(defaultFormatting);
  const [editorTab, setEditorTab] = useState("write");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [entryId, setEntryId] = useState<string | null>(null);
  const effectiveDisplayName = resolveDisplayName(displayName, nameEdited, suggestedName);

  useEffect(() => {
    let active = true;

    async function loadEntry() {
      const supabase = getSupabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Votre session a expiré. Reconnectez-vous avant de déposer un message.");

      const { data, error } = await supabase
        .from("guestbook_entries")
        .select("id, display_name, message, formatting")
        .eq("project_id", projectId)
        .eq("author_id", auth.user.id)
        .maybeSingle();

      if (error) throw new Error("Impossible de retrouver votre message. Actualisez la page avant de réessayer.");
      if (!active) return;
      setLoaded(true);
      if (!data) return;
      setEntryId(data.id);
      if (edited.current) return;
      setDisplayName(data.display_name);
      setMessage(data.message);
      setFormatting(data.formatting);
    }

    void loadEntry().catch(error => { if (active) setFeedback(error instanceof Error ? error.message : "Impossible de retrouver votre message. Actualisez la page avant de réessayer."); });
    return () => {
      active = false;
    };
  }, [projectId]);

  async function submit(event: FormEvent, status: "draft" | "published") {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
    const parsed = guestbookEntrySchema.safeParse({ displayName: effectiveDisplayName, message, formatting });
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
    rememberName(parsed.data.displayName);
    setFeedback(status === "published" ? "Votre message est publié." : "Votre brouillon est enregistré.");
    } catch { setFeedback("Enregistrement impossible. Vérifiez votre connexion puis réessayez."); }
    finally { setBusy(false); }
  }

  return (
    <form className="card stack" onChangeCapture={() => { edited.current = true; }} onClickCapture={event => { if ((event.target as HTMLElement).closest(".format-bar")) edited.current = true; }} onSubmit={(event) => submit(event, "published")}>
      <h2>Votre message</h2>
      <div className="actions editor-tabs"><button type="button" className="button secondary" aria-pressed={editorTab === "write"} onClick={() => setEditorTab("write")}>Écrire</button><button type="button" className="button secondary" aria-pressed={editorTab === "preview"} onClick={() => setEditorTab("preview")}>Aperçu</button></div>
      <div className={`editor-layout editor-tab-${editorTab}`}><div className="stack editor-input">
      <label>Nom affiché<input value={effectiveDisplayName} onChange={(e) => { setNameEdited(true); setDisplayName(e.target.value); }} maxLength={80} required /></label>
      <div className="format-bar">
        <select value={formatting.font} onChange={(e) => setFormatting({ ...formatting, font: e.target.value as GuestbookFormatting["font"] })} aria-label="Police">
          <option value="sans">Simple</option><option value="serif">Élégante</option><option value="hand">Manuscrite</option><option value="mono">Machine</option>
        </select>
        <select value={formatting.size} onChange={(e) => setFormatting({ ...formatting, size: e.target.value as GuestbookFormatting["size"] })} aria-label="Taille">
          <option value="sm">Petit</option><option value="md">Normal</option><option value="lg">Grand</option>
        </select>
        <button type="button" aria-label="Gras" aria-pressed={formatting.bold} className={formatting.bold ? "toggle active" : "toggle"} onClick={() => setFormatting({ ...formatting, bold: !formatting.bold })}>G</button>
        <button type="button" aria-label="Italique" aria-pressed={formatting.italic} className={formatting.italic ? "toggle active" : "toggle"} onClick={() => setFormatting({ ...formatting, italic: !formatting.italic })}><em>I</em></button>
        <select aria-label="Alignement" value={formatting.align} onChange={(event) => setFormatting({ ...formatting, align: event.target.value as GuestbookFormatting["align"] })}><option value="left">À gauche</option><option value="center">Centré</option><option value="right">À droite</option></select>
        <select aria-label="Couleur" value={formatting.color} onChange={(event) => setFormatting({ ...formatting, color: event.target.value as GuestbookFormatting["color"] })}><option value="ink">Encre</option><option value="blue">Bleu</option><option value="green">Vert</option><option value="burgundy">Bordeaux</option><option value="gold">Ocre</option></select>
      </div>
      <label>Votre message<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} maxLength={5000} placeholder="Écrivez votre message…" required /></label>
      </div><section className="editor-preview" aria-label="Aperçu du message"><GuestBookPage message={message} displayName={effectiveDisplayName} formatting={formatting} /></section></div>
      <p className="muted small">Vous pourrez ensuite ajouter un ou plusieurs souvenirs.</p>
      <div className="actions">
        <button className="button" disabled={busy || !loaded}>{busy ? "Enregistrement…" : entryId ? "Mettre à jour et publier" : "Publier mon message"}</button>
        <button className="button secondary" type="button" disabled={busy || !loaded} onClick={(event) => void submit(event as unknown as FormEvent, "draft")}>Enregistrer en brouillon</button>
      </div>
      {feedback && <p className="notice" role="status">{feedback}</p>}
    </form>
  );
}
