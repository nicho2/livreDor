import { getSupabaseBrowser } from "@/lib/supabase-browser";
export async function authenticatedFetch(url: string, init: RequestInit = {}) {
  const { data, error } = await getSupabaseBrowser().auth.getSession();
  if (error || !data.session) throw new Error("Session expirée. Reconnectez-vous.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Opération impossible. Réessayez.");
  }
  return response;
}
