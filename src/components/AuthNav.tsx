"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getAuthHref } from "@/lib/auth-navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthNav() {
  const { user, ready, error } = useAuth();
  const pathname = usePathname();
  const invitation = useSearchParams().get("invitation");
  const returnTo = invitation ? `${pathname}?invitation=${invitation}` : pathname;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function signOut() {
    setBusy(true);
    setFeedback("");
    try {
      // Disconnect this browser only, preserving any separate test session.
      const { error } = await getSupabaseBrowser().auth.signOut({ scope: "local" });
      if (error) { setFeedback("La déconnexion a échoué. Réessayez."); return; }
      router.refresh();
    } catch {
      setFeedback("La déconnexion a échoué. Vérifiez votre connexion.");
    } finally { setBusy(false); }
  }

  return (
    <nav className="nav" aria-label="Compte">
      {!ready ? <span className="muted" role="status">Vérification de la session…</span>
        : user ? <>
          <span className="status status-published">Connecté</span>
          <button className="link-button" type="button" disabled={busy} onClick={() => void signOut()}>{busy ? "Déconnexion…" : "Se déconnecter"}</button>
        </> : <Link href={getAuthHref(returnTo)}>Connexion</Link>}
      {(feedback || error) && <span role="alert" className="small">{feedback || error}</span>}
    </nav>
  );
}
