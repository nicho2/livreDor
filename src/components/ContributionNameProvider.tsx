"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { suggestDisplayName } from "@/lib/display-name";

const NameContext = createContext<{ suggestedName: string; rememberName: (name: string) => void } | null>(null);

export function ContributionNameProvider({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const [suggestedName, setSuggestedName] = useState("");
  useEffect(() => {
    let active = true;
    async function loadName() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const [memory, entry, profile] = await Promise.all([
          supabase.from("memories").select("display_name").eq("project_id", projectId).eq("author_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("guestbook_entries").select("display_name").eq("project_id", projectId).eq("author_id", auth.user.id).maybeSingle(),
          supabase.from("profiles").select("display_name").eq("id", auth.user.id).maybeSingle(),
        ]);
        const name = suggestDisplayName(memory.data?.display_name, entry.data?.display_name, profile.data?.display_name);
        // A name saved while loading must not be replaced by an older result.
        if (active) setSuggestedName((current) => current || name);
      } catch { /* Optional convenience: a failed lookup must not block contribution. */ }
    }
    void loadName();
    return () => { active = false; };
  }, [projectId]);

  return <NameContext.Provider value={{ suggestedName, rememberName: setSuggestedName }}>{children}</NameContext.Provider>;
}

export function useContributionName() {
  const context = useContext(NameContext);
  if (!context) throw new Error("ContributionNameProvider is required.");
  return context;
}
