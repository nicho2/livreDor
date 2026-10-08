"use client";
import Link from "next/link";
import { useProject } from "@/components/ProjectAccess";
import { memoryDateLabel } from "@/lib/presentation";
import { retentionDeadline } from "@/lib/contributor-information";

export function ContributorInformation({ compact = false }: { compact?: boolean }) {
  const project = useProject();
  const deadline = retentionDeadline(project.event_date);
  const dateLabel = (date: string) => memoryDateLabel({ occurred_on: date, year_from: null, year_to: null });
  if (compact) return <aside className="card stack" aria-label="Devenir de vos contributions">
    <p>Vos contributions publiées et leurs fichiers pourront faire partie du souvenir final. La clôture bloque les modifications ; elle ne supprime pas vos fichiers. L&apos;hébergement est limité à trois mois après l&apos;événement.</p>
    <Link href={`/p/${project.slug}/information`}>Comprendre les étapes et contacter l’organisateur</Link>
  </aside>;
  return <section className="stack">
    <h1>Votre contribution, jusqu’au souvenir final</h1>
    <ol className="stack">
      <li><strong>Pendant la collecte.</strong> Écrivez votre message, ajoutez des anecdotes et des fichiers. Vous pouvez les modifier tant que la collecte est ouverte. {project.closes_at ? `Clôture prévue : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(project.closes_at))} (heure de Paris).` : "La date de clôture reste à préciser par l’organisateur."}</li>
      <li><strong>Brouillon ou publication.</strong> Vos brouillons sont visibles par vous et les organisateurs. Les contenus publiés sont accessibles aux membres du projet connectés à LivreDor. Toute personne recevant le lien d’invitation partagé peut rejoindre la collecte ouverte.</li>
      <li><strong>À la clôture.</strong> La collecte est terminée : vous ne pouvez plus ajouter ou modifier de contributions. Le projet reste hébergé le temps que l’organisateur prépare et remette le souvenir final. Vous pouvez encore le contacter avec le formulaire ci-dessous tant que le projet est accessible.</li>
      <li><strong>La restitution.</strong> L’organisateur remet au destinataire un site autonome avec les messages, souvenirs et fichiers publiés. Le destinataire conserve ce souvenir durablement. Le ZIP contient aussi une sauvegarde privée avec les brouillons et contenus masqués. Seul le dossier du site final peut être partagé, selon les modalités annoncées par l’organisateur ; le ZIP complet doit rester privé. Les emails de connexion sont exclus de ces exports.</li>
      <li><strong>Fin du projet dans LivreDor.</strong> Après vérification de la restitution, l’organisateur supprime manuellement les données du projet et ses fichiers hébergés, au plus tard trois mois après l’événement. {deadline ? `Échéance maximale : ${dateLabel(deadline)}.` : "La date de l’événement doit être fixée pour calculer l’échéance."} Aucune purge automatique ni suppression planifiée n’est prévue. Le projet et son formulaire de contact ne sont alors plus accessibles. Le destinataire conserve le souvenir final ; les copies déjà remises ne sont pas effacées à distance.</li>
    </ol>
    <section className="card stack"><h2>Vos données et vos droits</h2>
      <p>L’email sert à la connexion et à la traçabilité. Votre nom affiché, vos textes et fichiers sont utilisés pour ce projet et sa restitution. Aucun suivi marketing n’est ajouté. Les messages envoyés à l’organisateur restent privés et sont exclus de la restitution.</p>
      <p>Tant que le projet est accessible, utilisez le formulaire ci-dessous pour une question, une correction, un retrait de média ou une demande d’accès ou d’effacement. Les adresses email des organisateurs ne sont pas affichées. Vous pouvez aussi demander le retrait d’un fichier sur lequel vous apparaissez. La suppression du projet ne supprime pas les copies du souvenir final déjà remises et ne met pas fin aux droits concernant vos données.</p>
      <p>N’envoyez que des fichiers que vous êtes autorisé à partager, en tenant compte des personnes représentées. Ne publiez pas d’informations sensibles sur d’autres personnes.</p>
      <p>Les informations propres à cette collecte — qui l’organise, sur quel fondement vos données sont utilisées, qui recevra le souvenir final et comment il sera partagé — doivent vous être communiquées avec l’invitation ou la notice du projet. Vous pouvez aussi <a href="https://www.cnil.fr/fr/adresser-une-plainte" target="_blank" rel="noreferrer">adresser une réclamation à la CNIL</a>.</p>
    </section>
  </section>;
}
