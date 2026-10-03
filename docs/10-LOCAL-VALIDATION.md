# Validation de développement — 3 octobre 2026

Projet testé : `depart-demo`, application locale sur `http://localhost:3000`,
base Supabase de développement distante. Aucun déploiement effectué.

## Vérifications réussies

- Connexion Supabase avec les clés locales ; les six tables métier sont accessibles.
- Authentification email activée et inscription autorisée.
- Première connexion OTP effectuée par l'utilisateur après configuration des
  modèles **Confirm sign up** et **Magic link or OTP** avec `{{ .Token }}`.
- Projet de démonstration créé et compte confirmé associé au rôle organisateur.
- Message principal et souvenir saisis par l'utilisateur : présents en base,
  tous deux `published`, accessibles au client anonyme.
- Trois souvenirs fictifs ajoutés via le client serveur de service, rattachés
  au compte organisateur et identifiés par le préfixe `TEST —`.
- Avant publication, les trois brouillons sont invisibles au client anonyme.
- Après publication, chaque souvenir est lisible par le client anonyme.
- Un souvenir modifié puis masqué reste conservé en base et devient invisible
  au client anonyme.
- Mur et chronologie : HTTP 200 ; les deux souvenirs fictifs publiés sont
  affichés et le souvenir masqué est absent.
- Chronologie : rendu de la date `12 juin 2015` et de la période `1998 – 2002`.

## Données fictives laissées dans le projet

- `TEST — Une journée mémorable` : publié, date exacte 2015-06-12.
- `TEST — Les premières années` : publié, période 1998–2002.
- `TEST — Brouillon puis masquage` : masqué, sans date.

Le message et le souvenir de l'utilisateur ont été conservés sans modification.
Le message principal étant unique par compte et projet, aucun second message
n'a été ajouté sous son compte.

## Limites et contrôles restant à réaliser

Les écritures des données fictives utilisent la clé de service : elles ne
valident pas les permissions d'écriture RLS d'un contributeur. Les contrôles
de visibilité utilisent la clé publique sans session et exercent la RLS de
lecture. Le compte de l'utilisateur étant organisateur, son parcours ne prouve
pas à lui seul les permissions d'un contributeur ordinaire.

Le contrôle du navigateur, initialement indisponible à cause d'une version
manquante dans le cache du plugin après mise à jour, a été réparé. La liste des
onglets, la lecture de la page de contribution et son actualisation sont
vérifiées. La session retrouve le message et les souvenirs après chargement.
Voir `11-BROWSER-TROUBLESHOOTING.md` pour la procédure reproductible.
Les clics brouillon/modification/masquage restent à vérifier dans l'interface.

Restent notamment : tests entre deux contributeurs et deux projets, tentatives
d'écriture anonymes, unicité du message principal, retour de session, fermeture
du projet, rendu de la personnalisation et ordre chronologique mixte
dates/périodes. R2 n'est pas configuré et les médias ne sont pas testés.

## Reprise du développement — sécurité et dates

Migration `0003_content_access_guards.sql` **appliquée à la base Supabase de
développement le 3 octobre 2026**, avec confirmation de l'utilisateur :
`Success. No rows returned`. Elle conditionne les lectures publiques à la visibilité du
projet, les écritures des contributeurs à sa fenêtre d'ouverture, et conserve
la modération par l'organisateur après clôture. Des triggers empêchent de
changer le projet ou l'auteur d'un contenu. Les règles média vérifient le
rattachement au souvenir et cachent les médias d'un souvenir non publié.

Vérifications locales effectuées sur une instance PostgreSQL 18 temporaire :
les trois migrations s'appliquent ; 21 assertions passent avec les rôles
`anon` et `authenticated`, deux contributeurs et un organisateur. L'instance
est arrêtée en fin de test et toutes les données de test sont annulées.
Le schéma `auth` est une émulation minimale : il reste nécessaire de valider
la migration et le parcours authentifié sur Supabase de développement.

Six tests unitaires passent : dates réelles/bissextiles, périodes ordonnées,
bornes des années, exclusion date/période simultanées, longueur des champs
et personnalisation bornée. Les mises à jour et masquages des souvenirs
exigent désormais une ligne retournée : un refus RLS filtrant toutes les
lignes ne peut plus être annoncé comme un succès.

`npm run lint`, `npm run typecheck`, `npm test` et `npm run build` passent.
PostgreSQL et le build nécessitent une exécution autorisée hors sandbox sur
cet environnement Windows (accès refusé dans le sandbox).
Ni données Supabase existantes, ni secrets, ni publication n'ont été modifiés.

### Contrôle après application sur Supabase

Vérification API en lecture seule : `is_project_public` retourne `true` pour
`depart-demo` ; `can_contribute` retourne `false` sans session ; un message
principal et trois souvenirs restent accessibles au client anonyme.
Ces contrôles ne remplacent pas les tests d'écriture avec plusieurs sessions.
Contrairement au bootstrap PostgreSQL minimal, le client anonyme peut appeler
`can_contribute` sur Supabase (qui retourne bien `false`) : les privilèges par
défaut de la plateforme restent à examiner si l'on souhaite interdire cet appel
lui-même. Les politiques d'écriture restent réservées à `authenticated`.

## Correction du parcours de connexion

Retour automatique après authentification, état partagé de session dans
l'en-tête et écran de connexion préalable aux formulaires de contribution.
La navigation n'utilise que des destinations projet locales validées.
Neuf tests unitaires (dont trois de navigation) passent, ainsi que lint,
TypeScript et build.

Dans le navigateur local déjà connecté : `/auth` mène automatiquement à
`/p/depart-demo/contribute` ; `/auth?next=%2Fp%2Fdepart-demo%2Fwall` mène au mur.
L'en-tête affiche « Connecté » et « Se déconnecter » sans adresse email.
La session utilisateur est conservée et aucune contribution n'a été modifiée.
Le nouveau cycle OTP et la déconnexion effective restent à vérifier : aucun
code n'a été redemandé et l'utilisateur n'a pas été déconnecté pendant ce test.

### Confirmation utilisateur et préremplissage du nom

L'utilisateur confirme ensuite avoir créé `TEST — Second contributeur` en
brouillon, s'être reconnecté, avoir retrouvé ses souvenirs et l'avoir publié.
Le cycle de reconnexion et la récupération du brouillon sont donc confirmés
manuellement ; les tentatives de modification des contenus d'un autre auteur
restent à vérifier sur Supabase.

Le nom affiché est désormais proposé à partir des contributions du compte
connecté dans ce projet (dernier souvenir, puis message, puis profil). Une
nouvelle saisie enregistrée devient la suggestion des souvenirs suivants.
Aucun email n'est utilisé et les noms des contenus existants restent inchangés.
Deux tests unitaires supplémentaires vérifient la priorité des suggestions
et le respect des champs modifiés ou explicitement vidés.

Vérification dans le navigateur connecté : le nouveau souvenir présente bien
un nom prérempli ; une saisie différente et l'effacement du champ sont respectés.
Le nom initial a été remis sans enregistrer. `TEST — Second contributeur` est
visible avec le statut publié. Aucun contenu existant n'a été modifié par ces
contrôles. Les 11 tests unitaires, lint, TypeScript et build passent.
