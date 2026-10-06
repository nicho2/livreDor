"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/api-client";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { organizerMessageSchema } from "@/lib/contributor-information";
import type { OrganizerMessage } from "@/types/database";

const categories = { help: "Question sur la collecte", media: "Question ou retrait d’un média", rights: "Demande concernant mes données" };

export function OrganizerContact({ projectId, organizer = false }: { projectId: string; organizer?: boolean }) {
  const [messages, setMessages] = useState<OrganizerMessage[]>([]);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nextOffset, setNextOffset] = useState(0);
  const [more, setMore] = useState(false);
  const pendingRequest = useRef<{ id: string; text: string } | null>(null);
  const load = useCallback(async (offset = 0) => {
    try {
    setLoading(true);
    const { data, error } = await getSupabaseBrowser().from("organizer_messages").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).order("id").range(offset, offset + 99);
    if (error) throw new Error("Les messages privés ne peuvent pas être chargés. Réessayez ou contactez l’organisateur par le canal de votre invitation.");
    setMessages(previous => offset === 0 ? data ?? [] : [...previous, ...(data ?? [])].filter((item, index, all) => all.findIndex(other => other.id === item.id) === index));
    setMore(data?.length === 100);
    setNextOffset(offset + (data?.length ?? 0));
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Chargement des messages impossible."); }
    finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);
  return <section className="card stack">
    <h2>{organizer ? "Messages privés des contributeurs" : "Contacter l’organisateur"}</h2>
    <p>{organizer ? "Ces messages sont privés et exclus de tous les exports. Une notification email est envoyée aux organisateurs ; vérifiez aussi cette liste en cas d’échec de notification. Vous pouvez répondre à l’email du contributeur depuis la notification. Une demande de droits doit être traitée dans les délais applicables, en principe un mois." : "Votre message sera enregistré pour vous et les organisateurs, puis envoyé par email aux organisateurs. Leurs adresses ne sont pas affichées ici. Votre email de connexion leur permet de vous répondre. Ce message ne sera ajouté ni au livre d’or ni à l’archive."}</p>
    {!organizer && <form className="stack" onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      const form = event.currentTarget;
      const values = new FormData(form);
      const parsed = organizerMessageSchema.safeParse({ displayName: values.get("displayName"), category: values.get("category"), body: values.get("body") });
      if (!parsed.success) { setFeedback(parsed.error.issues[0]?.message ?? "Message invalide."); return; }
      setBusy(true); setFeedback("");
      try {
        const db = getSupabaseBrowser();
        const { data: auth, error: authError } = await db.auth.getUser();
        if (authError || !auth.user) throw new Error("Connectez-vous pour écrire à l’organisateur.");
        const membership = await db.from("project_members").select("role").eq("project_id", projectId).eq("user_id", auth.user.id).maybeSingle();
        if (membership.error) throw new Error("Impossible de vérifier votre accès au projet.");
        if (!membership.data) {
          const joined = await db.rpc("join_project", { p_project_id: projectId });
          if (joined.error) throw new Error("La collecte est fermée ou pas encore ouverte et vous n’avez pas participé à ce projet. Contactez l’organisateur par le canal de votre invitation.");
        }
        const text = JSON.stringify(parsed.data);
        if (!pendingRequest.current || pendingRequest.current.text !== text) pendingRequest.current = { id: crypto.randomUUID(), text };
        await authenticatedFetch(`/api/projects/${projectId}/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...parsed.data, requestId: pendingRequest.current.id }) });
        pendingRequest.current = null;
        form.reset(); await load(); setFeedback("Votre message est enregistré et la notification email a été acceptée pour les organisateurs.");
      } catch (error) { setFeedback(error instanceof Error ? error.message : "Envoi impossible. Votre texte reste dans le formulaire."); }
      finally { setBusy(false); }
    }}>
      <fieldset className="stack" disabled={busy}>
        <label>Votre nom affiché<input name="displayName" required maxLength={120} autoComplete="name" /></label>
        <label>Objet de votre demande<select name="category">{Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Votre message privé<textarea name="body" required maxLength={5000} rows={5} /></label>
        <p className="muted">Indiquez le titre du souvenir concerné si nécessaire. Évitez les informations sensibles. Cinq messages maximum par 24 heures et par projet.</p>
        <button className="button" type="submit">{busy ? "Enregistrement…" : "Envoyer à l’organisateur"}</button>
      </fieldset>
    </form>}
    {feedback && <p className="notice" role="status">{feedback}</p>}
    <button type="button" className="button secondary" disabled={busy} onClick={() => void load()}>Actualiser les messages privés</button>
    {loading && <p role="status">Chargement des messages privés…</p>}
    {!loading && messages.length === 0 && <p>Aucun message privé.</p>}
    {messages.map(message => <article className="card stack" key={message.id}>
      <h3>{categories[message.category]} — {message.display_name}</h3>
      <p className="muted">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.created_at))} · {message.read_at ? "Lu par l’organisateur" : "À lire"} · {message.notification_sent_at ? "Notification envoyée" : "Notification non confirmée"}</p>
      <p className="message">{message.body}</p>
      {organizer && !message.read_at && <button type="button" className="button secondary" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          const { error } = await getSupabaseBrowser().rpc("mark_organizer_message_read", { p_message_id: message.id });
          if (error) throw new Error("Impossible de marquer ce message comme lu.");
          await load(); setFeedback("Message marqué comme lu. Cela ne signifie pas que la demande a été traitée.");
        } catch (error) { setFeedback(error instanceof Error ? error.message : "Modification impossible."); }
        finally { setBusy(false); }
      }}>Marquer comme lu</button>}
    </article>)}
    {more && <button type="button" className="button secondary" disabled={busy || loading} onClick={() => void load(nextOffset)}>Voir les messages plus anciens</button>}
  </section>;
}
