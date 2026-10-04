import { z } from "zod";

export const themeIds = ["album", "classic", "retirement", "birthday", "wedding", "departure", "birth", "memory"] as const;
export type ThemeId = typeof themeIds[number];
export const themeSchema = z.enum(themeIds);
export const themes: Record<ThemeId, { label: string; description: string; background: string; paper: string; accent: string; secondary: string; rose: string; radius: string }> = {
  album: { label: "Album chaleureux", description: "Papier crème et accents terracotta.", background: "#fbf5e9", paper: "#fffdf6", accent: "#9b442e", secondary: "#f4dfb5", rose: "#f3e3dd", radius: "18px" },
  classic: { label: "Classique", description: "Un album sobre aux tons neutres.", background: "#f5f4f0", paper: "#ffffff", accent: "#42556b", secondary: "#e1e7ed", rose: "#e9e5df", radius: "12px" },
  retirement: { label: "Retraite", description: "Une nouvelle aventure, entre sauge et miel.", background: "#f5f4e8", paper: "#fffef5", accent: "#426044", secondary: "#e0e8cf", rose: "#f3dfb9", radius: "18px" },
  birthday: { label: "Anniversaire", description: "Des touches de framboise et de pêche pour fêter ensemble.", background: "#fff4ed", paper: "#fffcf8", accent: "#9c3857", secondary: "#f7dfb4", rose: "#f3dce5", radius: "24px" },
  wedding: { label: "Mariage", description: "Ivoire, rose poudré et titres élégants.", background: "#faf3f2", paper: "#fffdfa", accent: "#80505f", secondary: "#eee1db", rose: "#f0dde4", radius: "14px" },
  departure: { label: "Départ d’entreprise", description: "Un souvenir collectif aux tons bleu encre et sable.", background: "#f2f5f6", paper: "#fffefa", accent: "#365869", secondary: "#dce8e9", rose: "#eee2cf", radius: "12px" },
  birth: { label: "Naissance", description: "Une douceur pastel, entre lavande et crème.", background: "#f7f3fa", paper: "#fffdf9", accent: "#6b527f", secondary: "#e6dff0", rose: "#f3e5d1", radius: "26px" },
  memory: { label: "Souvenir", description: "Un écrin apaisé, en papier sépia.", background: "#f4efe7", paper: "#fffaf1", accent: "#71513b", secondary: "#e6dccb", rose: "#e8ddd7", radius: "8px" },
};

export function resolveTheme(value: unknown): ThemeId {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : "album";
}

// Only predefined tokens enter CSS, including the autonomous archive.
export function themeVariables(id: ThemeId): Record<string, string> {
  const t = themes[id];
  return { "--bg": t.background, "--surface": t.paper, "--paper": t.paper, "--accent": t.accent, "--secondary": t.secondary, "--rose": t.rose, "--radius": t.radius, "--radius-paper": t.radius, "--notice-bg": t.secondary };
}

export function themeCss(id: ThemeId) {
  return Object.entries(themeVariables(id)).map(([key, value]) => `${key}:${value}`).join(";");
}
