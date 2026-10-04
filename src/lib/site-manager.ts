import type { User } from "@supabase/supabase-js";

// This allowlist is server configuration, never a role supplied by the client.
// Empty configuration denies creation to everyone.
export function isSiteManager(user: Pick<User, "email" | "email_confirmed_at">, allowlist: string | undefined) {
  if (!user.email || !user.email_confirmed_at) return false;
  const allowed = (allowlist ?? "").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.trim().toLowerCase());
}
