"use client";
import { useState } from "react";
import { ProjectTheme } from "@/components/ThemeProvider";
import { themes, themeIds, resolveTheme, type ThemeId } from "@/lib/themes";
export function ThemeSelector({ current, disabled, onSave }: { current: unknown; disabled: boolean; onSave: (theme: ThemeId) => Promise<void> }) {
  const [preview, setPreview] = useState<ThemeId>(resolveTheme(current));
  return <section className="card stack"><h2>Ambiance de l&apos;album</h2><p>Le thème choisi s&apos;applique à tous les participants et à l&apos;archive finale.</p>
    <label>Thème du projet<select value={preview} disabled={disabled} onChange={event => setPreview(resolveTheme(event.target.value))}>{themeIds.map(id => <option key={id} value={id}>{themes[id].label}</option>)}</select></label>
    <ProjectTheme theme={preview}><div className="theme-preview" aria-label="Aperçu du thème"><p className="kicker">{themes[preview].label}</p><h3>Des instants à garder</h3><article className="card"><p>Merci pour tous ces moments partagés 🌻</p><strong>Une signature, un souvenir.</strong></article><p>{themes[preview].description}</p></div></ProjectTheme>
    <button type="button" className="button" disabled={disabled || preview === resolveTheme(current)} onClick={() => void onSave(preview)}>Enregistrer le thème</button>
  </section>;
}
