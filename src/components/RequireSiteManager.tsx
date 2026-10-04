"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { RequireAuth } from "@/components/RequireAuth";
import { authenticatedFetch } from "@/lib/api-client";

function ManagerAccess({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/site-manager").then(response => response.json()).then(data => {
      if (active) { setAllowed(data.manager === true); setReady(true); }
    }).catch(() => { if (active) setError("Impossible de vérifier l'accès gestionnaire. Actualisez la page pour réessayer."); });
    return () => { active = false; };
  }, []);
  if (error) return <p role="alert" className="notice">{error}</p>;
  if (!ready) return <p role="status">Vérification de l&apos;accès gestionnaire…</p>;
  if (!allowed) return <p role="alert" className="notice">Cet espace est réservé aux gestionnaires du site.</p>;
  return children;
}
export function RequireSiteManager({ returnTo, children }: { returnTo: string; children: React.ReactNode }) {
  const { user } = useAuth();
  return <RequireAuth returnTo={returnTo}><ManagerAccess key={user?.id ?? "anonymous"}>{children}</ManagerAccess></RequireAuth>;
}
