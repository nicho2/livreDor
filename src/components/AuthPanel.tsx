"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setStep("otp");
    setMessage("Code envoyé. Consultez votre messagerie.");
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage("Connexion réussie. Vous pouvez revenir au projet.");
  }

  return (
    <div className="card auth-panel">
      <h1>Connexion</h1>
      <p className="muted">Aucun mot de passe : un code temporaire est envoyé par email.</p>
      {step === "email" ? (
        <form onSubmit={requestOtp} className="stack">
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <button className="button" disabled={busy}>{busy ? "Envoi…" : "Recevoir mon code"}</button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="stack">
          <label>Code reçu<input inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required /></label>
          <button className="button" disabled={busy}>{busy ? "Vérification…" : "Valider"}</button>
          <button type="button" className="link-button" onClick={() => setStep("email")}>Changer d&apos;email</button>
        </form>
      )}
      {message && <p className="notice">{message}</p>}
    </div>
  );
}
