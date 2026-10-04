import Link from "next/link";
import { ProjectList } from "@/components/ProjectList";
import { AlbumCover } from "@/components/AlbumCover";
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <section className="hero hero-album">
        <AlbumCover />
        <p className="kicker">Livre d&apos;or + souvenirs</p>
        <h1>Construire ensemble une histoire à transmettre.</h1>
        <p>LivreDor rassemble messages, anecdotes, photos, vidéos et souvenirs dans un espace collectif, puis permet de restituer l&apos;ensemble sous une forme durable.</p>
        <div className="actions">
          <Link className="button" href="/auth">Se connecter</Link>
        </div>
      </section>
      <ProjectList />
      <section className="grid">
        <article className="card"><h2>Livre d&apos;or</h2><p>Un message personnel, avec une mise en forme simple et cohérente.</p></article>
        <article className="card"><h2>Souvenirs</h2><p>Plusieurs anecdotes et médias peuvent compléter chaque contribution.</p></article>
        <article className="card"><h2>Restitution</h2><p>Le projet est pensé pour finir sous forme de site statique et d&apos;archive autonome.</p></article>
      </section>
    </main>
  );
}
