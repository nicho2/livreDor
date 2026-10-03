"use client";
import { useState } from "react";
import { createProjectSchema, projectDetailsFromForm, projectDetailsSchema, type ProjectDetails } from "@/lib/project-settings";

export function ProjectDetailsForm({ initial, creating = false, disabled = false, onSave }: {
  initial?: ProjectDetails; creating?: boolean; disabled?: boolean;
  onSave: (details: ProjectDetails & { slug?: string }) => Promise<void>;
}) {
  const [details, setDetails] = useState(initial ?? { title: "", subjectName: "", description: "", eventDate: "" });
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  function change(key: keyof ProjectDetails, value: string) { setFeedback(""); setDetails((previous) => ({ ...previous, [key]: value })); }
  return <form className="card stack" onSubmit={async (event) => {
    event.preventDefault(); setFeedback("");
    const form = new FormData(event.currentTarget);
    const values = projectDetailsFromForm(form);
    const parsed = creating ? createProjectSchema.safeParse({ ...values, slug: form.get("slug") }) : projectDetailsSchema.safeParse(values);
    if (!parsed.success) { setFeedback(parsed.error.issues[0]?.message ?? "Informations invalides."); return; }
    setDetails(values); setBusy(true);
    try { await onSave(parsed.data); setFeedback(creating ? "Projet créé. Ouverture de votre espace organisateur…" : "Informations enregistrées."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Enregistrement impossible. Réessayez."); }
    finally { setBusy(false); }
  }}>
    <h2>{creating ? "Votre nouveau LivreDor" : "Informations du projet"}</h2>
    <fieldset disabled={busy || disabled} className="stack">
      <label>Titre du LivreDor<input name="title" required maxLength={160} value={details.title} onChange={(e) => change("title", e.target.value)} /></label>
      <label>Prénom et nom, ou nom de l&apos;événement<input name="subjectName" required maxLength={120} value={details.subjectName} onChange={(e) => change("subjectName", e.target.value)} /></label>
      <label>Présentation (facultative)<textarea name="description" rows={4} maxLength={3000} value={details.description} onChange={(e) => change("description", e.target.value)} /></label>
      <label>Date de l&apos;événement (facultative)<input name="eventDate" type="date" value={details.eventDate} onChange={(e) => change("eventDate", e.target.value)} /></label>
      {creating && <><label>Lien du projet<input name="slug" required minLength={3} maxLength={80} pattern={"[a-z0-9][a-z0-9\\-]{2,79}"} placeholder="depart-marie-2026" value={slug} onChange={(e) => { setFeedback(""); setSlug(e.target.value); }} aria-describedby="project-slug-help" /></label><p id="project-slug-help" className="muted">3 à 80 lettres minuscules, chiffres ou tirets. Ce lien ne pourra pas être changé.</p></>}
      <p className="muted">Ces informations seront visibles aux personnes connectées à LivreDor et dans la restitution exportée. Ne saisissez pas d&apos;adresse email ni d&apos;information confidentielle.</p>
      {creating && <p>Vous devenez organisateur de ce nouveau projet. La collecte sera ouverte ; aucun droit sur les autres projets n&apos;est accordé.</p>}
      <button type="submit" className="button">{busy ? "Enregistrement…" : creating ? "Créer mon LivreDor" : "Enregistrer les informations"}</button>
    </fieldset>
    {feedback && <p role="status" className="notice">{feedback}</p>}
  </form>;
}
