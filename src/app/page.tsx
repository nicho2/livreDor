import Link from "next/link";

export default function HomePage() {
  const demoSlug = process.env.NEXT_PUBLIC_DEMO_PROJECT_SLUG;
  return (
    <main>
      <section className="hero">
        <p className="kicker">Livre d'or + souvenirs</p>
        <h1>Construire ensemble une histoire à transmettre.</h1>
        <p>LivreDor rassemble messages, anecdotes, photos, vidéos et souvenirs dans un espace collectif, puis permet de restituer l'ensemble sous une forme durable.</p>
        <div className="actions">
          <Link className="button" href="/auth">Se connecter</Link>
          {demoSlug && <Link className="button secondary" href={`/p/${demoSlug}`}>Voir le projet démo</Link>}
        </div>
      </section>
      <section className="grid">
        <article className="card"><h2>Livre d'or</h2><p>Un message personnel, avec une mise en forme simple et cohérente.</p></article>
        <article className="card"><h2>Souvenirs</h2><p>Plusieurs anecdotes et médias peuvent compléter chaque contribution.</p></article>
        <article className="card"><h2>Restitution</h2><p>Le projet est pensé pour finir sous forme de site statique et d'archive autonome.</p></article>
      </section>
    </main>
  );
}
