"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthPanel({ returnTo }: { returnTo: string }) {
  const isolatedRecipe = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "fixture-only";
  const router = useRouter();
  const { user, ready, error: sessionError } = useAuth();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(returnTo);
  }, [ready, user, router, returnTo]);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) return setMessage(error.message);
      setStep("otp");
      setMessage(isolatedRecipe ? "Recette isolée : aucun email envoyé. Saisissez le code fictif 123456." : "Code envoyé. Consultez votre messagerie.");
    } catch {
      setMessage("Impossible d'envoyer le code. Vérifiez votre connexion et réessayez.");
    } finally { setBusy(false); }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await getSupabaseBrowser().auth.verifyOtp({ email: email.trim(), token: otp.trim(), type: "email" });
      if (error) return setMessage(error.message);
      setMessage("Connexion réussie. Ouverture du projet…");
    } catch {
      setMessage("Impossible de vérifier le code. Vérifiez votre connexion et réessayez.");
    } finally { setBusy(false); }
  }

  if (!ready || user) return <p className="notice" role="status">{user ? "Ouverture du projet…" : "Vérification de votre connexion…"}</p>;

  return (
    <div className="card auth-panel">
      <h1>Connexion</h1>
      <p className="muted">{isolatedRecipe ? "Recette isolée : utilisez recette@example.test et le code 123456. Aucun email n’est envoyé." : "Aucun mot de passe : un code temporaire est envoyé par email."}</p>
      {step === "email" ? (
        <form onSubmit={requestOtp} className="stack">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <button className="button" disabled={busy || !!sessionError}>{busy ? "Envoi…" : "Recevoir mon code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="stack">
          <label>Code reçu<input inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} required /></label>
          <button className="button" disabled={busy}>{busy ? "Vérification…" : "Valider"}</button>
          <button type="button" className="link-button" disabled={busy} onClick={() => { setStep("email"); setOtp(""); setMessage(""); }}>Changer d&apos;email</button>
        </form>
      )}
      {(message || sessionError) && <p className="notice" role="status">{message || sessionError}</p>}
    </div>
  );
}
