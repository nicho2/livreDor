import { AuthPanel } from "@/components/AuthPanel";
import { getAuthReturnPath } from "@/lib/auth-navigation";
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  // Never query project metadata anonymously to choose a destination.
  return <main><AuthPanel returnTo={getAuthReturnPath(next)} /></main>;
}
