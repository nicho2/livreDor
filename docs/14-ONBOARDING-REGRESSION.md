# Création, paramètres et partage d'organisation

## Activation sur Supabase

**État au 3 octobre 2026 : 0004 et 0005 appliquées sur le Supabase de
développement configuré. Ne pas les rejouer sur cette base.** Les instructions
ci-dessous restent utiles pour une nouvelle instance.

Dans l'éditeur SQL du **projet Supabase de développement configuré**, exécuter
entièrement, dans l'ordre :

1. `supabase/migrations/0004_project_onboarding.sql`.
2. `supabase/migrations/0005_shared_organization.sql`.

Ces migrations ajoutent fonctions, protection d'identité et table d'invitations.
Elles ne suppriment aucune contribution et n'attribuent aucun nouveau rôle à un
compte existant. Ne pas les exécuter deux fois (trigger/table déjà créés).
L'application doit déjà disposer des migrations 0001 à 0003.
L'absence de 0004 produit un message explicite à la création ; sans 0005,
Organisation reste utilisable et explique pourquoi le partage est désactivé.
Ne pas coller une clé secrète dans le formulaire ni dans le SQL.

### Connexion directe et dépannage TLS

Pour une application par PostgreSQL, conserver `DATABASE_URL` uniquement dans
`.env.local` ignoré par Git. Copier la chaîne PostgreSQL complète depuis
Supabase → Connect (Session pooler), avec le mot de passe de la base et non une
clé API ; encoder les caractères réservés du mot de passe dans l'URL.
Vérifier que l'hôte et l'utilisateur correspondent au projet Supabase configuré
avant toute écriture. Ne jamais afficher cette chaîne dans les logs.

Si `psql` échoue avec une erreur de vérification du certificat, ne pas désactiver
TLS ni rétrograder sa vérification. Utiliser `sslmode=verify-full` et le certificat
CA fourni dans Database Settings → SSL Configuration → Download certificate.
La configuration officielle de Supabase Studio référence aussi ce certificat :
`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
Le télécharger par HTTPS vérifié ; fournir son fichier à `PGSSLROOTCERT`.
La confiance système seule n'a pas suffi sur ce poste.

Passer les identifiants à `psql` par variables d'environnement du processus,
pas dans ses arguments ; utiliser `-X` et `ON_ERROR_STOP=1`. Contrôler les objets
présents avant d'exécuter seulement les migrations absentes, puis vérifier les
permissions et la conservation des données. Une erreur TLS survient avant
l'exécution SQL : elle ne signifie pas que la migration a été appliquée.

## Utilisation

- Accueil → Créer un LivreDor → connexion OTP → renseigner les informations.
- Le lien choisi est stable ; il n'est pas modifiable ensuite.
- Le projet démarre ouvert. Le titre, le nom et la présentation sont publics.
- Le créateur accède directement à Organisation.
- « Informations du projet » permet de modifier titre, nom affiché, description
  et date d'événement (facultative). Les données existantes sont conservées.
- « Partager l'organisation » permet d'inviter une autre adresse email.
- Transmettre soi-même le lien `/p/LE-SLUG` : pas d'email automatique d'invitation.
- L'invité ouvre le projet et se connecte avec son code. L'adresse confirmée
  correspondante accepte l'invitation ; le lien Organisation apparaît.
- Deux organisateurs maximum, mêmes droits sur ce seul projet.
- Une invitation en attente peut être remplacée ou annulée. Une fois acceptée,
  la révocation n'est pas disponible dans cette V1 : vérifier l'adresse et ne
  partager ces droits qu'avec une personne de confiance.
- L'email d'invitation reste dans l'administration, hors des exports.

## Régressions : contrôle systématique

Arrêter le serveur local avant un build pour éviter les verrous Windows.

```powershell
npm run check
./scripts/test-rls-local.ps1
npm run test:integration
npm start
```

`check` couvre lint, types, tests unitaires et build ; RLS utilise un PostgreSQL
temporaire ; l'intégration utilise des identités/données HTTP locales et R2 réel,
en nettoyant seulement ses fichiers de test. Aucun utilisateur Supabase créé,
aucun projet utilisateur modifié par ces suites. Ne pas interpréter la fixture
HTTP comme une preuve de RLS : celle-ci est vérifiée séparément par SQL.

Pendant les modifications : `npm run test:watch` pour une alerte immédiate.
La CI `.github/workflows/regression.yml` répète `check` et les tests SQL sur un
PostgreSQL jetable. Elle s'activera lors d'un push demandé ; pas de secret requis.
Une CI verte ne remplace ni la recette OTP ni les médias représentatifs.

Sous Windows, lancer le script PostgreSQL directement, sans le placer dans un
pipeline `2>&1 | Select-String` : la capture globale peut conserver les handles
du processus serveur et bloquer `pg_ctl`. Les notices SQL sont déjà lisibles.

## Recette visuelle après activation

1. Créer un projet `TEST` ; vérifier retour à Organisation et lien stable.
2. Modifier ses informations ; recharger et consulter sa page projet.
3. Essayer le même lien depuis un autre compte : collision refusée, pas de droits.
4. Inviter un deuxième email ; essayer un troisième compte non invité : pas de droits.
5. Se connecter avec l'email invité : Organisation, modification, clôture/export.
6. Vérifier le ZIP : nouveaux textes/date, aucun email d'invitation.
7. Sur un projet sans invitation acceptée, essayer l'annulation en attente.
8. Rejouer contributions, publication, mur, médias et réouverture sur le projet
   de test, sans supprimer les souvenirs réels.

En cas de régression : conserver le message d'erreur et l'étape, ajouter d'abord
un test reproductible, corriger, puis repasser `check`, SQL et intégration.
Les commits locaux permettent une comparaison ciblée ; pas de reset destructif.
