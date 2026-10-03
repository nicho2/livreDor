"use client";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("album");
  useEffect(() => {
    void Promise.resolve().then(() => { try { const saved = localStorage.getItem("livredor-theme"); if (saved === "classic") setTheme(saved); } catch { /* Storage is optional. */ } });
  }, []);
  return <div data-theme={theme} className="theme-root"><div className="theme-selector"><label>Ambiance<select aria-label="Ambiance" value={theme} onChange={e => { setTheme(e.target.value); try { localStorage.setItem("livredor-theme", e.target.value); } catch { /* Storage is optional. */ } }}><option value="album">Album chaleureux</option><option value="classic">Classique</option></select></label></div>{children}</div>;
}
