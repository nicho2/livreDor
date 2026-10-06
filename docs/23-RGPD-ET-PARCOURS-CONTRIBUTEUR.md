# Confidentialité et parcours contributeur — contrôle du 4 octobre 2026

Évolution 0.1.3 préparée localement ; non déployée sur le site public. Le 5 octobre
2026, l'utilisateur a configuré la clé API Resend et l'expéditeur dans son
environnement local. La migration 0010 manquante a été appliquée au Supabase
hébergé, puis le formulaire local du projet jcd a enregistré un message technique
et Resend a accepté la notification. La réception dans la boîte destinataire
n'est pas attestée par ce test. Les mentions propres au responsable restent à
compléter. La version publique reste 0.1.2.

Mise à jour du 6 octobre : les migrations 0011 et 0012 de suppression auteur sont
également appliquées au Supabase configuré. Le contrôle local et la préparation
Git de 0.1.3 sont séparés de la publication. L'utilisateur configure Resend sur
l'hébergement ; la recette de l'email hébergé reste à effectuer.

## Conclusion de la revue

Les protections techniques existantes ne constituent pas une certification RGPD.
La règle utilisateur est désormais **trois mois maximum après l'événement**
pour les données hébergées du projet. La recette manuelle utilisateur est reportée
à sa demande. La restitution remise aux destinataires est distinguée des données
hébergées ; le destinataire la conserve durablement. Toute purge automatique est
explicitement interdite par l'utilisateur. La suppression reste manuelle, sans
tâche planifiée, après vérification de la restitution. Ses modalités de diffusion
et les demandes de retrait doivent être annoncées séparément.

## Changements réalisés

Le 5 octobre, clarification des textes contributeur : la clôture termine la
collecte ; le contact privé reste disponible tant que le projet est accessible.
La suppression manuelle met fin au projet et à son formulaire dans LivreDor.
Aucun formulaire indépendant ni affichage d'email personnel n'est promis.
La restitution remise reste chez le destinataire et les droits sur les données
ne cessent pas avec la suppression du projet. Les questions de responsabilité
et de traitement des demandes après restitution restent distinctes de l'interface.

- Page Étapes et contact, accessible depuis la navigation, l'accueil et la saisie.
- Page Données et confidentialité accessible sans connexion, lien près du champ
  email OTP et dans le pied de page. Les mentions génériques ne remplacent pas
  l'identité, la base légale et le contact effectivement annoncés pour le projet.
- Explication collecte → clôture → restitution → fin d'hébergement.
- Date limite calculée en trois mois calendaires à partir de `event_date`, avec
  arrondi au dernier jour du mois cible lorsque nécessaire.
- Information exacte : les publications sont lisibles par les comptes connectés
  à LivreDor, sans liste d'invités. Les brouillons restent accessibles aux auteurs
  et organisateurs ; ils font aussi partie de la sauvegarde privée du ZIP.
- Messages privés à l'organisateur : demande d'aide, média ou exercice de droits.
  Adresses organisateur invisibles au contributeur, notification Resend côté
  serveur, aucune inclusion dans les
  exports. Lecture réservée à l'auteur et aux organisateurs par RLS ; envoi par
  RPC avec session confirmée, appartenance vérifiée et limite atomique 5/24 h.
- Email séparé à chaque organisateur, avec l'email confirmé du contributeur en
  Reply-To pour permettre une réponse. Reprise idempotente du même message ;
  suivi privé conservé en cas d'échec. Les copies email ne sont pas rappelées
  par une suppression du projet.
- Accusé de lecture distinct du traitement effectif de la demande. Les
  organisateurs doivent consulter régulièrement leur boîte dans Organisation.

La migration 0010 ajoute seulement la table et deux RPC de contact. Elle ne
supprime aucune donnée. Les messages privés disparaissent avec le projet par
cascade ; leur envoi ne modifie pas la preuve d'export car ils en sont exclus.
Les membres peuvent demander un retrait après clôture. Un compte qui n'a jamais
rejoint un projet fermé utilise le canal de l'invitation ; le formulaire ne
contourne pas les contrôles d'appartenance.

La boîte charge les demandes par lots de 100 et permet de consulter les demandes
plus anciennes. Il n'existe pas de notification de réception des
réponses email dans LivreDor. Les invitations non acceptées ne sont pas des
organisateurs destinataires.

## Écarts à résoudre avant une collecte réelle

| Point | Résultat et action nécessaire |
| --- | --- |
| Responsable et finalité | Identifier le responsable et préciser la finalité de chaque projet. Le formulaire privé fonctionne tant que le projet est accessible ; aucun formulaire indépendant ni affichage d'email personnel n'est promis. |
| Base légale | À déterminer et expliquer selon le contexte ; aucun consentement global n'est inventé par le code. Si le consentement est retenu, prévoir preuve et retrait. Les tiers représentés doivent aussi être pris en compte. |
| Accès et destinataires | OTP n'est pas une liste d'invités. Annoncer cet accès actuel ou décider une restriction supplémentaire avant d'y déposer des contenus confidentiels. Fixer les destinataires de la restitution. |
| Conservation | Suppression exclusivement manuelle, sans purge automatique ni tâche planifiée. Fixer la date de l'événement et exécuter clôture/export/vérification/archivage/suppression avant l'échéance de trois mois. Afficher une durée ne suffit pas à la faire respecter. |
| Comptes et profils | La suppression d'un projet conserve les comptes Supabase/profils, partagés entre projets. Leur durée propre et la suppression d'un compte devenu inutile restent à définir. |
| ZIP privé et copies | La sauvegarde privée comprend brouillons/masqués. Ne jamais diffuser le ZIP complet. Déterminer sa durée propre, son effacement et celui des copies de restitution. Supprimer LivreDor ne rappelle pas les copies téléchargées. |
| Droits | Le formulaire donne un canal privé aux participants jusqu'à la suppression du projet ; les réponses se font par email. Organiser le suivi, l'identification proportionnée et les retraits dans les délais. Les demandes des personnes représentées et concernant les copies remises restent à organiser ; supprimer l'application ne met pas fin aux droits. |
| Sous-traitants | Vérifier les contrats applicables et les régions effectives Supabase, R2, Sites et Resend, ainsi que leurs sous-traitants/transferts. Les régions et durées des sauvegardes/journaux n'ont pas été attestées dans cette revue. |
| Sauvegardes et incidents | Documenter les durées des sauvegardes/journaux, la propagation d'un effacement après restauration et la procédure de violation de données. |

## Procédure à trois mois

1. Dès l'ouverture, noter événement, clôture et date limite ; annoncer le contact
   et les modalités de remise du souvenir final dans l'invitation.
2. Clôturer suffisamment tôt pour corriger/modérer et préparer le ZIP.
3. Vérifier la restitution et protéger ou supprimer la sauvegarde privée selon
   sa nécessité ; remettre seulement le site publié aux destinataires convenus.
4. Avant la date limite, archiver et supprimer le projet via Organisation ;
   vérifier le nettoyage R2 et PostgreSQL. Garder une trace minimale de l'opération
   sans copie des contributions ou des messages privés.
5. Traiter séparément comptes inutilisés, sauvegardes/journaux et copies remises.

## Références vérifiées

La CNIL précise les mentions d'information (identité, finalité, base légale,
destinataires, durée, droits et réclamation) :
[information et transparence](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence).
La durée doit être justifiée et appliquée :
[durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
Le suivi des demandes de droits et les délais sont décrits dans
[les droits des personnes](https://www.cnil.fr/fr/passer-laction/les-droits-des-personnes-sur-leurs-donnees).

Contrats à confronter aux offres et paramètres effectivement utilisés :
[DPA Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum),
[DPA Cloudflare](https://www.cloudflare.com/cloudflare-customer-scc/),
[DPA spécifique ChatGPT Sites](https://openai.com/policies/chatgpt-sites-data-processing-addendum/).
L'existence d'un contrat public ne prouve pas sa couverture du compte ni une
localisation exclusivement européenne des données.
