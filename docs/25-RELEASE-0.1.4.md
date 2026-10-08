# Release 0.1.4 — Invitations partagées

Publiée le 8 octobre 2026 : [release GitHub](https://github.com/nicho2/livreDor/releases/tag/v0.1.4)
et [site](https://livredor.nicho2.chatgpt.site), commit
`f1ec35c74e7d5101cabc98f9b6fed9ff4725d104`. Version Sites 9, environnement
révision 9. Migration 0013 appliquée avec TLS et contrôle transactionnel des
empreintes des huit tables existantes : données conservées. Les contrôles HTTP
du site affichent 0.1.4 et les API administratives refusent les appels anonymes.

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
