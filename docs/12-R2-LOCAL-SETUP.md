# Configuration R2 pour les tests locaux

Le client utilise l'API S3 et un bucket privé. Les quatre variables R2 restent
dans `.env.local`, jamais dans Git ou dans le navigateur. La configuration
actuelle utilise l'adresse S3 par défaut, sans juridiction EU.

## Identifiants

- `R2_ACCOUNT_ID` : identifiant complet du compte, sans URL.
- `R2_ACCESS_KEY_ID` : Access Key ID du jeton R2.
- `R2_SECRET_ACCESS_KEY` : Secret Access Key du jeton R2, pas le jeton API brut.
- `R2_BUCKET_NAME` : nom exact du bucket, pas le nom du jeton ou de la variable.

Créer un jeton R2 « Object Read & Write » limité à ce bucket. Ne pas élargir ses
droits pour contourner un problème de configuration. Garder désactivés l'accès
public `r2.dev` et les domaines publics.

## CORS

Dans Cloudflare : R2 → bucket concerné → Settings / Paramètres → CORS Policy →
Add / Edit → onglet JSON. Copier `config/r2-cors.local.json` et enregistrer.
Si une politique existe déjà, conserver les règles utiles plutôt que la remplacer
sans examen. Ce fichier n'autorise que `http://localhost:3000`, pas toute origine.
Les suppressions prévues côté serveur ne nécessitent pas DELETE dans CORS.

CORS permet au navigateur d'utiliser les URLs signées ; il ne rend pas les
objets publics et ne corrige pas un refus d'authentification de l'API S3.
Après changement des variables locales, redémarrer le serveur Next.js.

Documentation officielle :
- [Authentification R2](https://developers.cloudflare.com/r2/api/tokens/)
- [Configuration CORS](https://developers.cloudflare.com/r2/buckets/cors/)

## Contrôle du 3 octobre 2026

Les quatre variables sont renseignées. Leur vérification ne révèle pas les
secrets. Les formats du compte et des clés semblent cohérents ; le nom de bucket
contient cependant des majuscules et des underscores et doit être corrigé.
Deux requêtes en lecture seule ont été tentées : liste limitée à un objet et
lecture des règles CORS. Toutes deux retournent HTTP 403 `AccessDenied`.
La connexion n'est donc pas validée. La lecture CORS peut aussi nécessiter des
droits de configuration que le jeton d'objets n'a pas : utiliser le tableau de bord
pour configurer CORS, sans donner des droits administrateur au jeton applicatif.

Aucun objet n'a été lu, ajouté ou supprimé. Aucune règle distante n'a été changée.
Après correction du nom, retester l'accès ; si le refus persiste, vérifier le
compte, le bucket sélectionné dans la portée du jeton et les identifiants S3.
Les uploads depuis le navigateur restent à implémenter et à tester.

### Nouveau contrôle après correction du nom du bucket

L'accès en lecture au bucket retourne maintenant HTTP 200 : les identifiants
permettent bien d'atteindre le bucket configuré. La lecture de la configuration
CORS reste interdite (403), compatible avec un jeton limité aux objets.
Une requête de pré-vérification OPTIONS, pour un PUT signé depuis
`http://localhost:3000` avec `Content-Type`, retourne également 403 sans en-tête
CORS. L'autorisation navigateur n'est donc pas encore validée : vérifier la
politique dans le tableau de bord et appliquer `config/r2-cors.local.json`.
Aucun PUT n'a été envoyé et aucun objet n'a été créé ou supprimé.
