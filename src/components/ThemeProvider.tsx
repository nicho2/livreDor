"use client";
import { createContext, useContext, useEffect, useState, type CSSProperties } from "react";
import { resolveTheme, themeVariables, type ThemeId } from "@/lib/themes";

const ThemeContext = createContext<((theme: ThemeId) => void) | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeId>("album");
  return <ThemeContext.Provider value={setTheme}><div data-theme={theme} className="theme-root" style={themeVariables(theme) as CSSProperties}>{children}</div></ThemeContext.Provider>;
}

export function ProjectTheme({ theme, global = false, children }: { theme: unknown; global?: boolean; children: React.ReactNode }) {
  const id = resolveTheme(theme);
  const setTheme = useContext(ThemeContext);
  useEffect(() => {
    if (!global || !setTheme) return;
    setTheme(id);
    return () => setTheme("album");
  }, [global, id, setTheme]);
  return <div data-theme={id} className="project-theme" style={themeVariables(id) as CSSProperties}>{children}</div>;
}
