import { AuthPanel } from "@/components/AuthPanel";
import { getAuthReturnPath } from "@/lib/auth-navigation";
import { getSupabaseAnonClient } from "@/lib/supabase-server";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  let returnTo = getAuthReturnPath(next);
  if (returnTo === "/") {
    const demoSlug = process.env.NEXT_PUBLIC_DEMO_PROJECT_SLUG;
    returnTo = demoSlug ? getAuthReturnPath(`/p/${demoSlug}/contribute`) : "/";
    // Direct /auth access has no project context. Pick only a single public
    // project; never arbitrarily select one in a multi-project installation.
    if (returnTo === "/") {
      try {
        const { data, error } = await getSupabaseAnonClient().from("projects").select("slug").neq("status", "draft").limit(2);
        if (!error && data?.length === 1) returnTo = getAuthReturnPath(`/p/${data[0].slug}/contribute`);
      } catch { /* The connection screen also remains usable without a backend. */ }
    }
  }
  return <main><AuthPanel returnTo={returnTo} /></main>;
}
