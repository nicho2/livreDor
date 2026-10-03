"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type AuthState = { user: User | null; ready: boolean; error: string };
const AuthContext = createContext<AuthState>({ user: null, ready: false, error: "" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, ready: false, error: "" });

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function connect() {
      try {
        const { data } = getSupabaseBrowser().auth.onAuthStateChange((_event, session) => {
          // UI state only. Database permissions continue to be enforced by RLS.
          // Keep this callback synchronous: no additional auth requests here.
          if (active) setState({ user: session?.user ?? null, ready: true, error: "" });
        });
        unsubscribe = () => data.subscription.unsubscribe();
      } catch {
        if (active) setState({ user: null, ready: true, error: "La connexion est indisponible pour le moment." });
      }
    }
    void connect();
    return () => { active = false; unsubscribe?.(); };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
