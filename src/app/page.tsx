import Link from "next/link";
import { getSupabaseAnonClient } from "@/lib/supabase-server";
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const demoSlug = process.env.NEXT_PUBLIC_DEMO_PROJECT_SLUG;
  const { data: projects, error } = await getSupabaseAnonClient().from("projects").select("slug,title,subject_name,status").order("created_at", { ascending: false }).limit(50);
  return (
    <main>
      <section className="hero">
        <p className="kicker">Livre d&apos;or + souvenirs</p>
        <h1>Construire ensemble une histoire à transmettre.</h1>
        <p>LivreDor rassemble messages, anecdotes, photos, vidéos et souvenirs dans un espace collectif, puis permet de restituer l&apos;ensemble sous une forme durable.</p>
        <div className="actions">
          <Link className="button" href="/nouveau">Créer un LivreDor</Link>
          <Link className="button" href="/auth">Se connecter</Link>
          {demoSlug && <Link className="button secondary" href={`/p/${demoSlug}`}>Voir le projet démo</Link>}
        </div>
      </section>
      <section className="stack"><h2>Les projets</h2>
        {error && <p className="notice">Impossible de charger les projets. Réessayez dans quelques instants.</p>}
        {!error && !projects?.length && <p className="empty">Aucun projet disponible pour le moment.</p>}
        <div className="grid">{projects?.map((project) => <article className="card" key={project.slug}><h3>{project.title}</h3><p>{project.subject_name}</p><Link className="button" href={`/p/${project.slug}`}>Ouvrir le projet</Link></article>)}</div>
      </section>
      <section className="grid">
        <article className="card"><h2>Livre d&apos;or</h2><p>Un message personnel, avec une mise en forme simple et cohérente.</p></article>
        <article className="card"><h2>Souvenirs</h2><p>Plusieurs anecdotes et médias peuvent compléter chaque contribution.</p></article>
        <article className="card"><h2>Restitution</h2><p>Le projet est pensé pour finir sous forme de site statique et d&apos;archive autonome.</p></article>
      </section>
    </main>
  );
}
