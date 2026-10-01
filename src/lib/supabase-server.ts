import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function getSupabaseAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are missing.");
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Supabase server environment variables are missing.");
  }

  return createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getUserFromBearerToken(token: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}
