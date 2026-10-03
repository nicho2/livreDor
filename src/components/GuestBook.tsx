"use client";
import { useEffect, useRef, useState } from "react";
import { formattingClasses } from "@/lib/presentation";
import type { GuestbookEntry, GuestbookFormatting } from "@/types/database";

export function GuestBookPage({ message, displayName, formatting, date }: { message: string; displayName: string; formatting: GuestbookFormatting; date?: string }) {
  return <article className="book-page stack"><p className="kicker">Un mot à garder</p><p className={formattingClasses(formatting)}>{message || "Votre message prendra vie ici…"}</p><footer><strong>{displayName || "Votre signature"}</strong>{date && <p className="muted small">{new Date(date).toLocaleDateString("fr-FR")}</p>}</footer></article>;
}

export function GuestBook({ entries }: { entries: GuestbookEntry[] }) {
  const [mode, setMode] = useState("grid");
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState<{ from: number; direction: number } | null>(null);
  const [mobile, setMobile] = useState(false);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(query.matches);
    update(); query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!turning) return;
    // Fallback if a browser cancels animationend (resize or motion preference change).
    const timer = window.setTimeout(() => setTurning(null), 750);
    return () => window.clearTimeout(timer);
  }, [turning]);
  const count = mobile ? 1 : 2;
  const index = Math.min(page, Math.max(0, entries.length - 1));
  function turn(direction: number) {
    if (turning || (direction < 0 && index === 0) || (direction > 0 && index + count >= entries.length)) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setTurning({ from: index, direction });
    setPage(Math.max(0, Math.min(entries.length - 1, index + direction * count)));
  }
  const front = turning ? entries[turning.from + (turning.direction > 0 ? count - 1 : 0)] : null;
  const back = turning ? entries[index + (turning.direction > 0 ? 0 : count - 1)] : null;
  return <section className="stack"><div className="actions" aria-label="Présentation du livre"><button className="button secondary" aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>Vue globale</button><button className="button secondary" aria-pressed={mode === "book"} onClick={() => setMode("book")}>Feuilleter le livre</button></div>
    {!entries.length ? <p className="empty">Aucun message publié pour le moment.</p> : mode === "grid" ? <div className="grid">{entries.map(entry => <GuestBookPage key={entry.id} message={entry.message} displayName={entry.display_name} formatting={entry.formatting} date={entry.created_at} />)}</div> : <>
      <div className="open-book" tabIndex={0} aria-label="Livre ouvert, flèches gauche et droite pour feuilleter" onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); turn(e.key === "ArrowRight" ? 1 : -1); } }} onTouchStart={e => { start.current = e.touches[0].clientX; }} onTouchEnd={e => { if (start.current !== null && Math.abs(e.changedTouches[0].clientX - start.current) > 60) turn(e.changedTouches[0].clientX < start.current ? 1 : -1); start.current = null; }}>
        {entries.slice(index, index + count).map(entry => <GuestBookPage key={entry.id} message={entry.message} displayName={entry.display_name} formatting={entry.formatting} date={entry.created_at} />)}
        {turning && front && <div className={`turning-sheet turn-${turning.direction > 0 ? "next" : "previous"}`} aria-hidden="true" onAnimationEnd={() => setTurning(null)}>
          <div className="sheet-face sheet-front"><GuestBookPage message={front.message} displayName={front.display_name} formatting={front.formatting} date={front.created_at} /></div>
          <div className="sheet-face sheet-back">{back && <GuestBookPage message={back.message} displayName={back.display_name} formatting={back.formatting} date={back.created_at} />}</div>
        </div>}
      </div><div className="actions book-controls"><button className="button secondary" disabled={index === 0 || Boolean(turning)} onClick={() => turn(-1)}>← Précédent</button><span role="status">Page {index + 1}{count === 2 && index + 1 < entries.length ? ` – ${index + 2}` : ""} sur {entries.length}</span><button className="button secondary" disabled={index + count >= entries.length || Boolean(turning)} onClick={() => turn(1)}>Suivant →</button></div>
    </>}
  </section>;
}
