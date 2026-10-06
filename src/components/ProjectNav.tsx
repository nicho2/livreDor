"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
export function ProjectNav({ slug, projectId }: { slug: string; projectId: string }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [organizer, setOrganizer] = useState(false);
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { if (active) setOrganizer(false); return; }
      // Only a database invitation matching this user's verified email can grant rights.
      await getSupabaseBrowser().rpc("accept_project_organizer_invite", { p_project_id: projectId });
      const { data } = await getSupabaseBrowser().from("project_members").select("role").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
      if (active) setOrganizer(data?.role === "organizer");
    }
    void load(); return () => { active = false; };
  }, [projectId, user]);
  const links = [["", "Le projet"], ["/contribute", "Mes contributions"], ["/guestbook", "Livre d’or"], ["/wall", "Voir tous les souvenirs"], ["/timeline", "Chronologie"]];
  links.push(["/information", "Étapes et contact"]);
  if (organizer) links.push(["/admin", "Organisation"]);
  return <nav className="project-nav" aria-label="Navigation du projet">{links.map(([suffix, title]) => {
    const href = `/p/${slug}${suffix}`;
    return <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><span className="desktop-nav-label">{title}</span><span className="mobile-nav-label">{({ "": "Accueil", "/contribute": "Écrire", "/guestbook": "Livre", "/wall": "Souvenirs", "/timeline": "Frise", "/information": "Contact", "/admin": "Organiser" } as Record<string, string>)[suffix]}</span></Link>;
  })}</nav>;
}
