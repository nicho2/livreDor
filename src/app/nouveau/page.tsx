import { RequireAuth } from "@/components/RequireAuth";
import { CreateProject } from "@/components/CreateProject";
export default function NewProjectPage() {
  return <main className="stack"><div><p className="kicker">Créer un LivreDor</p><h1>Commencer une nouvelle histoire.</h1><p>Connectez-vous avec votre email et votre code, puis créez votre projet. Vous en serez l&apos;organisateur.</p></div><RequireAuth returnTo="/nouveau"><CreateProject /></RequireAuth></main>;
}
