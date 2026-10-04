import { RequireSiteManager } from "@/components/RequireSiteManager";
import { CreateProject } from "@/components/CreateProject";
export default function NewProjectPage() {
  return <main className="stack"><RequireSiteManager returnTo="/nouveau"><div><p className="kicker">Créer un LivreDor</p><h1>Commencer une nouvelle histoire.</h1><p>Vous serez l&apos;organisateur du nouveau projet.</p></div><CreateProject /></RequireSiteManager></main>;
}
