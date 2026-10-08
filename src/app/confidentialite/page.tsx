import Link from "next/link";

export default function PrivacyPage() {
  return <main className="card stack">
    <h1>Données et confidentialité</h1>
    <p>LivreDor rassemble des messages, souvenirs et fichiers pour préparer une restitution collective autour d’une personne ou d’un événement.</p>
    <h2>Connexion et données collectées</h2>
    <p>Votre email permet de recevoir un code de connexion, de rattacher vos contributions à votre compte et, si vous contactez l’organisateur, de lui permettre de vous répondre. Il n’apparaît pas dans les pages de souvenirs ni dans les exports. Votre nom affiché, vos textes et les fichiers que vous choisissez d’envoyer complètent le projet. Aucun suivi marketing n’est ajouté par LivreDor.</p>
    <h2>Qui peut consulter ?</h2>
    <p>Les publications sont accessibles aux membres du projet connectés à LivreDor. Toute personne recevant le lien d’invitation partagé peut rejoindre la collecte ouverte ; l’accès est ensuite mémorisé pour son compte. Les brouillons et contenus masqués sont réservés à leurs auteurs et aux organisateurs. Les demandes de contact sont privées entre leur auteur et les organisateurs et sont également transmises par email aux organisateurs.</p>
    <h2>Conservation et restitution</h2>
    <p>Les données hébergées du projet et ses fichiers doivent être supprimés au plus tard trois mois après l’événement. L’organisateur effectue cette suppression manuellement, après vérification de la restitution. Aucune purge automatique ni suppression planifiée n’est prévue. Le destinataire conserve la restitution autonome qui lui est remise. L’archive privée de l’organisateur contient aussi les brouillons et contenus masqués et doit rester privée. Les copies téléchargées et emails ne sont pas effacés à distance.</p>
    <p>Les comptes de connexion partagés entre projets et les sauvegardes techniques sont distincts des données d’un projet. Leur durée et leur effacement doivent être précisés par le responsable du service.</p>
    <h2>Prestataires et droits</h2>
    <p>LivreDor utilise Supabase pour la connexion et les données structurées, Cloudflare R2 pour les fichiers privés, Sites pour l’hébergement et Resend pour les emails. La localisation effective, les contrats applicables et les durées des sauvegardes doivent être confirmés par le responsable.</p>
    <p>Tant que le projet est accessible, la page « Étapes et contact » propose un formulaire privé pour une question, une correction, un retrait ou l’exercice de vos droits, sans afficher l’email des organisateurs. À la clôture, la collecte s’arrête mais ce formulaire reste disponible jusqu’à la suppression du projet. Après suppression, le projet et son formulaire ne sont plus accessibles. Cette suppression ne met pas fin aux droits concernant vos données et n’efface pas les copies déjà remises aux destinataires.</p>
    <p>L’organisateur doit vous indiquer son identité, la base légale du traitement, les destinataires de la restitution et les modalités de diffusion avant une collecte réelle. Vous pouvez aussi <a href="https://www.cnil.fr/fr/adresser-une-plainte" target="_blank" rel="noreferrer">adresser une réclamation à la CNIL</a>.</p>
    <Link href="/">Retour à l’accueil</Link>
  </main>;
}
