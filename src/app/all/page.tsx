import Link from "next/link";
import { RequireSiteManager } from "@/components/RequireSiteManager";
import { ProjectList } from "@/components/ProjectList";

export default function ManagerPage() {
  return <main className="stack"><h1>Gestion du site</h1><RequireSiteManager returnTo="/all"><p>Créez un nouvel album ou retrouvez les projets existants.</p><Link className="button" href="/nouveau">Créer un LivreDor</Link><ProjectList /></RequireSiteManager></main>;
}
