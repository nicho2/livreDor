"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { memorySchema } from "@/lib/validators";
import type { Memory, PublicationStatus } from "@/types/database";
import { useContributionName } from "@/components/ContributionNameProvider";
import { resolveDisplayName } from "@/lib/display-name";
import { MediaGallery } from "@/components/MediaGallery";
import { validateMediaFile } from "@/lib/media";
import { MEDIA_ACCEPT, uploadMemoryMedia } from "@/lib/media-upload";

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
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [mediaRevision, setMediaRevision] = useState(0);
  const submitting = useRef(false);
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
    setPendingFiles([]);
    setUploadProgress("");
  }

  function editMemory(memory: Memory) {
    if (busy) return;
    if (pendingFiles.length && !window.confirm("Les fichiers sélectionnés ne sont pas encore envoyés. Abandonner cette sélection ?")) return;
    setPendingFiles([]);
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
    // Wait for the populated editor to render, including repeated edits of the same memory.
    requestAnimationFrame(() => {
      const heading = editorHeading.current;
      if (!heading) return;
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "start",
      });
    });
  }

  async function saveMemory(event: FormEvent, status: Extract<PublicationStatus, "draft" | "published">) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
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
      // Keep the memory private until all selected media have been finalized.
      status: pendingFiles.length ? "draft" : status,
    };

    const { data, error } = editingId
      ? await supabase.from("memories").update(values).eq("id", editingId).eq("project_id", projectId).eq("author_id", auth.user.id).select("id").single()
      : await supabase.from("memories").insert({
          ...values,
          project_id: projectId,
          author_id: auth.user.id,
        }).select("id").single();

    if (error) {
      setFeedback(error.message);
      return;
    }

    rememberName(parsed.data.displayName);
    setEditingId(data.id);
    if (pendingFiles.length) {
      try {
        for (const file of pendingFiles) {
          await uploadMemoryMedia(projectId, data.id, file, percent => setUploadProgress(`${file.name} : ${percent} %`));
          setPendingFiles(files => files.filter(candidate => candidate !== file));
          setMediaRevision(revision => revision + 1);
        }
        if (status === "published") {
          const { error: publishError } = await supabase.from("memories").update({ status: "published" })
            .eq("id", data.id).eq("project_id", projectId).eq("author_id", auth.user.id).select("id").single();
          if (publishError) throw new Error(publishError.message);
        }
      } catch (error) {
        setFeedback(`Souvenir conservé en brouillon. ${error instanceof Error ? error.message : "Envoi impossible."} Les fichiers déjà envoyés sont conservés ; réessayez pour terminer.`);
        await loadMemories();
        return;
      } finally { setUploadProgress(""); }
    }
    resetForm();
    setFeedback(status === "published" ? "Souvenir publié." : "Souvenir enregistré en brouillon.");
    await loadMemories();
    } catch { setFeedback("Enregistrement impossible. Vérifiez votre connexion puis réessayez."); }
    finally { setBusy(false); submitting.current = false; }
  }

  async function publishMemory(memory: Memory) {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const supabase = getSupabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Connectez-vous avant de publier un souvenir.");
      const { error } = await supabase.from("memories").update({ status: "published" })
        .eq("id", memory.id).eq("project_id", projectId).eq("author_id", auth.user.id).eq("status", "draft").select("id").single();
      if (error) throw new Error(error.message);
      setFeedback("Souvenir publié.");
      await loadMemories();
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Publication impossible. Réessayez."); }
    finally { setBusy(false); submitting.current = false; }
  }

  function selectFiles(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (pendingFiles.length + selected.length > 20) { setFeedback("20 fichiers maximum par souvenir, en comptant les fichiers déjà ajoutés."); return; }
    for (const file of selected) {
      const valid = validateMediaFile(file.name, file.type, file.size);
      if (!valid.ok) { setFeedback(`${file.name} : ${valid.error}`); return; }
    }
    setPendingFiles(current => [...current, ...selected]);
    setFeedback("");
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
                {memory.status === "draft" && <button className="button" type="button" disabled={busy || editingId === memory.id} onClick={() => void publishMemory(memory)}>Publier</button>}
                <button className="button secondary" type="button" disabled={busy} onClick={() => editMemory(memory)}>Modifier</button>
                <button className="link-button danger" type="button" disabled={busy} onClick={() => void hideMemory(memory.id)}>Masquer</button>
              </div>
              {editingId !== memory.id && <MediaGallery key={`${memory.id}-${mediaRevision}`} memoryId={memory.id} projectId={projectId} editable disabled={busy} />}
            </article>
          ))}
        </div>
      )}

      <form className="card stack" onSubmit={(event) => saveMemory(event, "published")}>
        <h3 ref={editorHeading} tabIndex={-1} style={{ scrollMarginTop: "24px" }}>{editingId ? "Modifier le souvenir" : "Nouveau souvenir"}</h3>
        <fieldset disabled={busy} className="stack memory-editor-fields">
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
        {editingId && <MediaGallery key={`${editingId}-${mediaRevision}`} memoryId={editingId} projectId={projectId} />}
        <label>Ajouter une photo, vidéo, audio ou PDF
          <input type="file" multiple accept={MEDIA_ACCEPT} onChange={event => { selectFiles(event.target.files); event.target.value = ""; }} />
          <span className="muted">Photos : 15 Mo · vidéos : 200 Mo · audio : 50 Mo · PDF : 25 Mo. 20 fichiers maximum par souvenir.</span>
        </label>
        {pendingFiles.length > 0 && <ul>{pendingFiles.map((file, index) => <li key={index}>{file.name} <button className="link-button" type="button" onClick={() => setPendingFiles(files => files.filter((_, i) => i !== index))}>Retirer</button></li>)}</ul>}
        <p className="muted small">Les fichiers sélectionnés seront envoyés à l’enregistrement. Un brouillon reste visible uniquement par vous et les organisateurs.</p>
        </fieldset>
        <div className="actions">
          <button className="button" disabled={busy}>{busy ? "Enregistrement…" : editingId ? "Mettre à jour et publier" : "Publier ce souvenir"}</button>
          <button className="button secondary" type="button" disabled={busy} onClick={(event) => void saveMemory(event as unknown as FormEvent, "draft")}>Enregistrer en brouillon</button>
          {editingId && <button className="link-button" type="button" disabled={busy} onClick={() => { if (!pendingFiles.length || window.confirm("Abandonner les fichiers sélectionnés non envoyés ?")) resetForm(); }}>Annuler</button>}
        </div>
        {uploadProgress && <p role="status">Envoi : {uploadProgress}</p>}
        {feedback && <p className="notice" role="status">{feedback}</p>}
      </form>
    </section>
  );
}
