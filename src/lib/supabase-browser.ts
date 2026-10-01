"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let client: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseBrowser() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase public environment variables are missing.");
  }

  client = createClient<Database>(url, anonKey);
  return client;
}
