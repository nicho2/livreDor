"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getAuthHref } from "@/lib/auth-navigation";

export function RequireAuth({ returnTo, children }: { returnTo: string; children: React.ReactNode }) {
  const { user, ready, error } = useAuth();
  if (!ready) return <p className="notice" role="status">Vérification de votre connexion…</p>;
  if (!user) return (
    <section className="card stack">
      <h2>{returnTo === "/nouveau" ? "Connectez-vous pour créer votre LivreDor" : returnTo.endsWith("/admin") ? "Connectez-vous pour organiser" : "Connectez-vous pour contribuer"}</h2>
      <p>Un code par email suffit. Vous reviendrez directement ici après connexion.</p>
      {error ? <p role="alert">{error}</p> : <Link className="button" href={getAuthHref(returnTo)}>Recevoir mon code</Link>}
    </section>
  );
  return children;
}
