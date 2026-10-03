/* eslint-disable @next/next/no-img-element -- Private signed URLs must bypass public image optimizers. */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { authenticatedFetch } from "@/lib/api-client";
import { validateMediaFile } from "@/lib/media";
import type { MediaAsset } from "@/types/database";

function uploadFile(url: string, file: File, progress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.timeout = 15 * 60 * 1000;
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Envoi refusé par le stockage. Réessayez."));
    xhr.onerror = () => reject(new Error("Envoi interrompu. Vérifiez votre connexion."));
    xhr.ontimeout = () => reject(new Error("L'envoi a pris trop longtemps. Réessayez."));
    xhr.send(file);
  });
}

export function MediaGallery({ memoryId, projectId, editable = false }: { memoryId: string; projectId: string; editable?: boolean }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const load = useCallback(async () => {
    try {
      const db = getSupabaseBrowser();
      const { data, error } = await db.from("media_assets").select("*").eq("project_id", projectId).eq("memory_id", memoryId).neq("status", "hidden").order("created_at");
      if (error) throw new Error("Impossible de charger les médias.");
      setMedia(data ?? []);
      const { data: auth } = await db.auth.getSession();
      const loaded = await Promise.all((data ?? []).filter((m) => m.status === "published").map(async (m) => {
        const headers: HeadersInit = auth.session ? { Authorization: `Bearer ${auth.session.access_token}` } : {};
        const res = await fetch(`/api/media/${m.id}`, { headers, cache: "no-store" });
        const json = await res.json();
        return [m.id, res.ok ? json.url : ""] as [string, string];
      }));
      setUrls(Object.fromEntries(loaded));
    } catch (error) { setFeedback(error instanceof Error ? error.message : "Chargement impossible."); }
  }, [memoryId, projectId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function add(file: File) {
    setFeedback("");
    const valid = validateMediaFile(file.name, file.type, file.size);
    if (!valid.ok) { setFeedback(valid.error); return; }
    setBusy(true); setProgress(0);
    let mediaId: string | undefined;
    try {
      const prepared = await authenticatedFetch("/api/media/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, memoryId, filename: file.name, mimeType: file.type, sizeBytes: file.size }),
      });
      const reservation = await prepared.json();
      mediaId = reservation.mediaId;
      await uploadFile(reservation.uploadUrl, file, setProgress);
      await authenticatedFetch(`/api/media/${mediaId}`, { method: "POST" });
      setFeedback("Média ajouté. Il suit la visibilité de ce souvenir.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Envoi impossible.");
      if (mediaId) await authenticatedFetch(`/api/media/${mediaId}`, { method: "DELETE" }).catch(() => {});
    } finally { setBusy(false); await load(); }
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer définitivement ce fichier ? Cette action est irréversible.")) return;
    setBusy(true);
    try { await authenticatedFetch(`/api/media/${id}`, { method: "DELETE" }); setFeedback("Fichier supprimé."); }
    catch (error) { setFeedback(error instanceof Error ? error.message : "Suppression impossible."); }
    finally { setBusy(false); await load(); }
  }

  const images = media.filter(m => m.kind === "image" && !["image/heic", "image/heif"].includes(m.mime_type) && urls[m.id]);
  const index = Math.min(imageIndex, Math.max(0, images.length - 1));
  const image = images[index];
  function move(direction: number) { setImageIndex((index + direction + images.length) % images.length); setZoom(false); }
  return <div className="stack media-gallery">
    {!editable && image && <section className="stack" aria-label="Galerie de photos">
      <div className={zoom ? "image-stage zoomed" : "image-stage"} onTouchStart={e => { swipeStart.current = e.touches[0].clientX; }} onTouchEnd={e => { if (swipeStart.current !== null && Math.abs(e.changedTouches[0].clientX - swipeStart.current) > 60) move(e.changedTouches[0].clientX < swipeStart.current ? 1 : -1); swipeStart.current = null; }}>

        <img src={urls[image.id]} alt={image.original_filename} onError={() => setFeedback("Photo indisponible. Actualisez les médias.")} />
      </div><div className="actions book-controls"><button type="button" className="button secondary" disabled={images.length < 2} onClick={() => move(-1)}>← Photo précédente</button><span role="status">Photo {index + 1} sur {images.length}</span><button type="button" className="button secondary" disabled={images.length < 2} onClick={() => move(1)}>Photo suivante →</button><button type="button" className="button secondary" aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? "Réduire" : "Zoomer"}</button><a href={urls[image.id]} target="_blank" rel="noreferrer">Ouvrir en plein écran</a></div>
      <div className="image-thumbnails">{images.map((item, i) => <button type="button" key={item.id} aria-label={`Photo ${i + 1} : ${item.original_filename}`} aria-pressed={index === i} onClick={() => { setImageIndex(i); setZoom(false); }}><img src={urls[item.id]} alt="" loading="lazy" /></button>)}</div>
    </section>}
    {media.filter(item => editable || !images.some(image => image.id === item.id)).map((item) => <figure key={item.id}>
      {urls[item.id] ? <>
        {/* Signed private URLs must not be cached by a public image optimizer. */}

        {item.kind === "image" && !["image/heic", "image/heif"].includes(item.mime_type) && <a href={urls[item.id]} target="_blank" rel="noreferrer"><img src={urls[item.id]} alt={item.original_filename} loading="lazy" onError={() => setFeedback("Aperçu indisponible. Actualisez les médias ou téléchargez le fichier.")} /></a>}
        {item.kind === "video" && <video src={urls[item.id]} controls preload="metadata" />}
        {item.kind === "audio" && <audio src={urls[item.id]} controls preload="metadata" />}
        <figcaption><a href={urls[item.id]} target="_blank" rel="noreferrer">{item.original_filename}</a> · {(item.size_bytes / 1024 / 1024).toFixed(1)} Mo</figcaption>
      </> : <figcaption>{item.original_filename} — {item.status === "draft" ? "Envoi non terminé" : "Aperçu indisponible"}</figcaption>}
      {editable && <button type="button" className="link-button danger" disabled={busy} onClick={() => void remove(item.id)}>Supprimer le fichier</button>}
    </figure>)}
    {media.length > 0 && <button type="button" className="link-button" onClick={() => void load()} disabled={busy}>Actualiser les médias</button>}
    {editable && <label>Ajouter une photo, vidéo, audio ou PDF
      <input type="file" disabled={busy} accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/webm,audio/ogg,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void add(file); }} />
      <span className="muted">Photos : 15 Mo · vidéos : 200 Mo · audio : 50 Mo · PDF : 25 Mo. 20 fichiers maximum.</span>
    </label>}
    {busy && <div role="status">Envoi : {progress} %<progress max={100} value={progress} /></div>}
    {feedback && <p className="notice" role="status">{feedback}</p>}
  </div>;
}
