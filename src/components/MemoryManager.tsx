"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { memorySchema } from "@/lib/validators";
import type { Memory, PublicationStatus } from "@/types/database";
import { useContributionName } from "@/components/ContributionNameProvider";
import { resolveDisplayName } from "@/lib/display-name";
import { MediaGallery } from "@/components/MediaGallery";

type DateMode = "none" | "exact" | "period";

const emptyForm = {
  displayName: "",
  title: "",
  body: "",
  occurredOn: "",
  yearFrom: "",
  yearTo: "",
};

export function MemoryManager({ projectId }: { projectId: string }) {
  const { suggestedName, rememberName } = useContributionName();
  const [nameEdited, setNameEdited] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [dateMode, setDateMode] = useState<DateMode>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const displayName = resolveDisplayName(form.displayName, nameEdited, suggestedName);

  const loadMemories = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data, error } = await supabase
      .from("memories")
      .select("*")
      .eq("project_id", projectId)
      .eq("author_id", auth.user.id)
      .neq("status", "hidden")
      .order("created_at", { ascending: false });

    if (error) setFeedback(error.message);
    else setMemories(data);
  }, [projectId]);

  useEffect(() => {
    let active = true;

    async function loadInitialMemories() {
      const supabase = getSupabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data, error } = await supabase
        .from("memories")
        .select("*")
        .eq("project_id", projectId)
        .eq("author_id", auth.user.id)
        .neq("status", "hidden")
        .order("created_at", { ascending: false });

      if (!active) return;
      if (error) setFeedback(error.message);
      else setMemories(data);
    }

    void loadInitialMemories();
    return () => {
      active = false;
    };
  }, [projectId]);

  function resetForm() {
    setForm(emptyForm);
    setNameEdited(false);
    setDateMode("none");
    setEditingId(null);
  }

  function editMemory(memory: Memory) {
    setNameEdited(true);
    setEditingId(memory.id);
    setForm({
      displayName: memory.display_name,
      title: memory.title ?? "",
      body: memory.body,
      occurredOn: memory.occurred_on ?? "",
      yearFrom: memory.year_from?.toString() ?? "",
      yearTo: memory.year_to?.toString() ?? "",
    });
    setDateMode(memory.occurred_on ? "exact" : memory.year_from || memory.year_to ? "period" : "none");
    setFeedback("");
  }

  async function saveMemory(event: FormEvent, status: Extract<PublicationStatus, "draft" | "published">) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
    const parsed = memorySchema.safeParse({
      displayName,
      title: form.title,
      body: form.body,
      occurredOn: dateMode === "exact" ? form.occurredOn : "",
      yearFrom: dateMode === "period" && form.yearFrom ? Number(form.yearFrom) : null,
      yearTo: dateMode === "period" && form.yearTo ? Number(form.yearTo) : null,
    });

    if (!parsed.success) {
      setBusy(false);
      setFeedback(parsed.error.issues[0]?.message ?? "Vérifiez les informations du souvenir.");
      return;
    }

    const supabase = getSupabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      setFeedback("Connectez-vous avant d'ajouter un souvenir.");
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
      title: parsed.data.title || null,
      body: parsed.data.body,
      occurred_on: parsed.data.occurredOn || null,
      year_from: parsed.data.yearFrom,
      year_to: parsed.data.yearTo,
      status,
    };

    const { error } = editingId
      ? await supabase.from("memories").update(values).eq("id", editingId).eq("project_id", projectId).eq("author_id", auth.user.id).select("id").single()
      : await supabase.from("memories").insert({
          ...values,
          project_id: projectId,
          author_id: auth.user.id,
        }).select("id").single();

    setBusy(false);
    if (error) {
      setFeedback(error.message);
      return;
    }

    rememberName(parsed.data.displayName);
    resetForm();
    setFeedback(status === "published" ? "Souvenir publié." : "Souvenir enregistré en brouillon.");
    await loadMemories();
    } catch { setFeedback("Enregistrement impossible. Vérifiez votre connexion puis réessayez."); }
    finally { setBusy(false); }
  }

  async function hideMemory(id: string) {
    if (!window.confirm("Masquer ce souvenir et ses médias sur le mur ?")) return;
    setBusy(true);
    try {
    const supabase = getSupabaseBrowser();
    // RLS may filter an UPDATE to zero rows (e.g. after project closure).
    // Require a returned row before announcing success.
    const { error } = await supabase.from("memories").update({ status: "hidden" }).eq("id", id).eq("project_id", projectId).select("id").single();
    setBusy(false);
    if (error) setFeedback(error.message);
    else {
      if (editingId === id) resetForm();
      setFeedback("Souvenir masqué.");
      await loadMemories();
    }
    } catch { setFeedback("Masquage impossible. Réessayez."); }
    finally { setBusy(false); }
  }

  return (
    <section className="stack">
      <div>
        <p className="kicker">Souvenirs</p>
        <h2>Ajoutez une anecdote</h2>
        <p className="muted">Vous pouvez ajouter plusieurs souvenirs, indépendamment de votre message principal.</p>
      </div>

      {memories.length > 0 && (
        <div className="stack">
          {memories.map((memory) => (
            <article className="card memory-summary" key={memory.id}>
              <div>
                <span className={`status status-${memory.status}`}>{memory.status === "published" ? "Publié" : "Brouillon"}</span>
                <h3>{memory.title || "Souvenir sans titre"}</h3>
                <p>{memory.body}</p>
              </div>
              <div className="actions">
                <button className="button secondary" type="button" onClick={() => editMemory(memory)}>Modifier</button>
                <button className="link-button danger" type="button" disabled={busy} onClick={() => void hideMemory(memory.id)}>Masquer</button>
              </div>
              <MediaGallery memoryId={memory.id} projectId={projectId} editable />
            </article>
          ))}
        </div>
      )}

      <form className="card stack" onSubmit={(event) => saveMemory(event, "published")}>
        <h3>{editingId ? "Modifier le souvenir" : "Nouveau souvenir"}</h3>
        <label>Nom affiché<input value={displayName} onChange={(event) => { setNameEdited(true); setForm({ ...form, displayName: event.target.value }); }} maxLength={80} required /></label>
        <label>Titre (facultatif)<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={120} /></label>
        <label>Anecdote<textarea value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} rows={6} maxLength={8000} required /></label>
        <label>Quand ?
          <select value={dateMode} onChange={(event) => setDateMode(event.target.value as DateMode)}>
            <option value="none">Date non précisée</option>
            <option value="exact">Date exacte</option>
            <option value="period">Année ou période</option>
          </select>
        </label>
        {dateMode === "exact" && <label>Date<input type="date" value={form.occurredOn} onChange={(event) => setForm({ ...form, occurredOn: event.target.value })} required /></label>}
        {dateMode === "period" && (
          <div className="year-fields">
            <label>De (année)<input type="number" min={1900} max={2200} value={form.yearFrom} onChange={(event) => setForm({ ...form, yearFrom: event.target.value })} /></label>
            <label>À (année, facultatif)<input type="number" min={1900} max={2200} value={form.yearTo} onChange={(event) => setForm({ ...form, yearTo: event.target.value })} /></label>
          </div>
        )}
        <div className="actions">
          <button className="button" disabled={busy}>{busy ? "Enregistrement…" : editingId ? "Mettre à jour et publier" : "Publier ce souvenir"}</button>
          <button className="button secondary" type="button" disabled={busy} onClick={(event) => void saveMemory(event as unknown as FormEvent, "draft")}>Enregistrer en brouillon</button>
          {editingId && <button className="link-button" type="button" onClick={resetForm}>Annuler</button>}
        </div>
        {feedback && <p className="notice">{feedback}</p>}
      </form>
    </section>
  );
}
