# Release 0.1.4 — Invitations partagées

L'accueil affiche seulement les projets dont le compte est membre. Le premier
accès passe par le lien partagé muni d'un code aléatoire, conservé pendant la
connexion OTP puis retiré de l'URL après acceptation. Aucune contribution n'est
nécessaire pour retrouver le projet ensuite.

L'organisateur copie un lien commun aux invités et peut le renouveler. L'ancien
lien cesse d'admettre de nouveaux membres ; les membres existants conservent
leur accès. Les invitations nominatives organisateur restent disponibles.
Le gestionnaire du site conserve son annuaire complet contrôlé côté serveur.

La migration 0013 ajoute une table privée d'invitations et limite les lectures
RLS aux membres. Les codes ne figurent pas dans les exports. Les anciens liens
sans code restent utilisables par les membres existants ; pour inviter un nouveau
participant, copier le nouveau lien depuis Organisation.

Validation : lint, TypeScript, 53 tests unitaires, builds Next.js et Sites,
tests SQL sur PostgreSQL jetable, 45 contrôles HTML/API par runtime et recette
mobile dans le navigateur intégré. La recette OTP réelle hébergée reste distincte
des comptes simulés utilisés localement.
