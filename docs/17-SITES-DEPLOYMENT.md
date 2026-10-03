# Déploiement LivreDor sur OpenAI Sites

## Architecture et accès

Sites héberge un Worker ESM et les assets navigateur. `npm run build:sites`
compile les mêmes routes via Vinext, sans remplacer `npm run dev/build/start`
Next.js. Le script restaure les déclarations de routes Next après compilation.
Le manifeste `.openai/hosting.json` contient uniquement l'identifiant Sites.
Pas de D1, de nouveau bucket, de connexion ChatGPT ou de changement de RLS.

L'utilisateur a autorisé l'accès public par lien le 3 octobre 2026. Cela ne rend
pas les brouillons publics : l'OTP Supabase reste nécessaire pour contribuer,
et les opérations organisateur contrôlent toujours le rôle côté serveur.
Les informations et contenus `published` des projets publiables sont accessibles
aux visiteurs anonymes. Ne pas traiter le lien comme un secret d'accès.

## Variables

Configurer dans Sites les huit clés de `.env.example`. Marquer comme secrets
`SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
Ne pas ajouter `DATABASE_URL` ou la clé Resend. SMTP reste dans Supabase.
Les valeurs `NEXT_PUBLIC_*` sont incorporées à la compilation navigateur : après
changement, recompiler, pas seulement modifier les variables de production.
Les autres clés restent côté serveur. `LIVREDOR_MAX_PROJECTS=3` compte aussi
les projets de développement si la même base Supabase est utilisée.

## Préparation des intégrations

Origine prévue, obtenue lors de l'enregistrement Sites :
`https://livredor.nicho2.chatgpt.site`. Ce n'est pas une preuve de mise en ligne.

1. Dans Supabase Authentication → URL Configuration, ajouter les retours du site
   HTTPS (notamment `/auth`) ; définir Site URL selon l'environnement principal.
   Conserver localhost pour la recette locale. Ne pas rejouer les migrations 0001–0006.
2. Dans Cloudflare R2 → bucket → Settings → CORS, ajouter cette origine à la règle
   existante en conservant les origines locales et les éventuelles autres règles.
   Exemple dans `../config/r2-cors.sites.json`. Ne pas rendre le bucket public.
   La clé applicative Object Read & Write ne permet pas de lire/modifier CORS :
   c'est normal, ne pas élargir ses droits.
3. Vérifier modèles OTP/SMTP Resend, consentement et conservation avant partage
   d'un projet comportant des données réelles.

## Contrôles avant sauvegarde/publication

`npm run check` : lint, TypeScript, tests unitaires et build Next.js.
`npm run build:sites`, puis `npm run test:sites` : mêmes contrôles API que
`npm run test:integration`, sur Workers local avec Auth/PostgREST fictifs locaux
et R2 réel. Aucun compte Supabase ni projet utilisateur n'est modifié ; seuls
les objets temporaires propres à la suite sont créés puis nettoyés.

Validation du 3 octobre : 38 tests unitaires et 59 contrôles API sur chacun des
deux runtimes, y compris quota, deuxième organisateur, PUT/finalisation/lecture,
masquage/clôture et ZIP contenant le média. Aucun secret serveur trouvé dans
les assets navigateur compilés. Cela ne remplace pas la recette OTP en ligne.

Le workflow Sites pousse le code exact sur son propre dépôt, sauvegarde une
version puis déploie son archive. Il ne change pas `origin` GitHub. Ne pas
présenter une version sauvegardée ou un statut pending comme une publication
réussie : exiger le statut succeeded et l'URL officielle du déploiement.

## Recette après publication

Ouvrir le lien sans session ChatGPT : accueil, projet, mur et chronologie.
Depuis un projet, obtenir un OTP réel, vérifier le retour automatique et le nom
prérempli, créer un brouillon puis publier ; essayer une petite image et sa lecture.
Avec un autre compte, vérifier les contenus publiés et l'absence des brouillons.
Avec l'organisateur, modérer, clôturer et télécharger le ZIP.
Pas de seed sur le projet `test-recette` déjà enrichi de contenus utilisateur.

## État

Publication confirmée par Sites le 3 octobre 2026 à 17 h 12 (Paris), statut
`succeeded`, URL `https://livredor.nicho2.chatgpt.site`, version 1, configuration
d'environnement révision 6, source `e4770b108a91c85d809fb10dfb479b5b6c5d48a7`.
Déploiement : `appgdep_6ac11b5f81b48191b29502a59e11ead3`.

Après correction dans Cloudflare confirmée par l'utilisateur, la pré-vérification
CORS pour cette origine retourne HTTP 204, avec origine exacte autorisée,
méthodes `PUT, GET, HEAD` et en-tête `content-type`. Autorisation navigateur
validée ; cela ne remplace pas l'essai d'upload réel sur le site hébergé.
Lecture de politique via S3 interdite (403) avec la clé applicative ; ne pas
élargir ses droits. Aucun objet créé par cette sonde OPTIONS.
Recette OTP et navigateur en ligne restant à effectuer par l'utilisateur.

Packaging Windows : le helper fourni appelle GNU tar sous Git Bash. Ajouter
`TAR_OPTIONS=--force-local` à l'environnement du processus, sinon le lecteur
`E:` est interprété comme un hôte distant. Aucun changement du packager fourni.
Les contrôles réussis ont été réutilisés après cette correction ; l'archive
validée contient uniquement le build et le manifeste, sans clés incorporées.

## Incident de rendu HTML après la première publication

L'utilisateur signale une erreur 500 sur `GET /`. Les journaux de production
identifient `No such module "dist/server/ssr/index.js"` : la compilation émet
`index.mjs` et `ssr/index.mjs`, mais l'entrée adaptée `index.js` entraîne un
chargement du rendu HTML à l'emplacement `ssr/index.js`. Ce n'est pas une erreur
d'OTP, de Supabase ou de CORS. Les tests API ne chargent pas le module SSR.

Le script de build conserve également une copie du module SSR sous le nom
attendu. Sept routes HTML sont ajoutées à la suite commune : accueil, connexion,
création, projet, mur, chronologie et détail. Le test d'accueil reproduit l'échec
avant correction ; après reconstruction, les 73 contrôles Workers passent.
`npm run test:sites:html` exécute les 14 contrôles HTML seuls sans fichier
d'environnement ni accès R2/Supabase distant ; cette vérification est ajoutée
à la CI GitHub après compilation Sites.
La vérification du statut de déploiement ne remplace donc pas le contrôle HTTP
des pages de l'application. Aucun contenu ni média utilisateur modifié.
