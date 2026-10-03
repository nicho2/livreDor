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

## Nouveau contrôle multi-contributeurs local

Suite PostgreSQL isolée réexécutée à la demande de l'utilisateur : deux
contributeurs fictifs, un organisateur et deux projets. Les 21 assertions passent,
y compris la lecture des publications d'un autre auteur, la confidentialité des
brouillons, le refus de modification par un autre auteur et les restrictions
après clôture. Les identités sont simulées dans PostgreSQL, pas des comptes OTP
réels. Aucun compte n'a été créé dans Supabase et le projet de démonstration n'a
pas été fermé. Les fixtures sont annulées et l'instance locale est arrêtée.

La page de contribution filtre volontairement les souvenirs par auteur connecté ;
elle sert à gérer ses propres contenus. Le mur affiche les publications de tous
les auteurs. Ce comportement ne doit pas être confondu avec un refus RLS de lire
les contributions publiées des autres.

## V1 complète — médias, organisation et archive (3 octobre 2026)

Fonctionnalités implémentées : réservation média, PUT R2 direct avec progression,
vérification et copie finale immuable, GET signé privé, suppression avec masquage
puis effacement ; navigation projet commune, noms/styles bornés, détail des
souvenirs, chronologie mixte ; modération organisateur, fenêtre de collecte,
clôture, archivage ; ZIP avec site autonome et sauvegarde privée séparés.
Aucune nouvelle migration SQL n'est nécessaire pour ce jalon.

### Vérifications réellement réalisées

- `npm run lint` : zéro erreur, zéro avertissement.
- `npm run typecheck` et build Webpack de production : réussis.
- `npm test` : 17 tests unitaires passent (OTP/navigation, nom, dates/périodes,
  formats et tailles médias, tri chronologique, classes de style autorisées,
  exclusion brouillons/masqués et échappement des textes du site statique).
- Suite PostgreSQL 18 isolée réexécutée : 21 assertions RLS passent avec rôles
  anon/authenticated, deux auteurs, un organisateur et deux projets ; rollback
  des fixtures et arrêt de l'instance.
- `npm run test:integration` : 33 contrôles des **API Next compilées**, avec
  Auth/PostgREST fictifs **locaux** et stockage **R2 réel**, réussis. Ils couvrent
  session obligatoire/invalide, auteur/projet, taille/extension, PUT/CORS,
  finalisation, GET et contenu binaire identique, réutilisation du PUT sans
  écrasement final, parent brouillon privé, admin/export interdits au contributeur,
  clôture/modération, export ZIP extrait et média identique, exclusion brouillons
  et HTML utilisateur, suppression logique/physique, clé objet forgée refusée.
  Aucun compte Supabase créé, aucune session navigateur extraite : les objets R2
  de cette suite utilisent des UUID aléatoires et sont nettoyés au terme du test.
- Dans le navigateur avec la **vraie session Supabase** déjà ouverte : création
  de `TEST — Médias V1` en brouillon, upload d'une image PNG synthétique,
  finalisation et aperçu privé, publication et persistance au rechargement,
  lecture sur le mur et sur la page détail. Image décodée : 1 × 1 pixel.
  Aucun contenu existant d'un utilisateur n'a été modifié.
- Le compte contributeur actuel reçoit « Accès au projet refusé » sur la route
  organisateur ; il ne voit pas le lien Organisation ni les contenus administrateur.
- Largeur mobile 375 pixels : détail sans débordement horizontal ; viewport remis
  au réglage initial après test. La preuve visuelle est sauvegardée hors du dépôt.
- Client anonyme Supabase : le média du souvenir publié est lisible ; R2 sans
  signature refuse la lecture (HTTP 400). Ce dernier contrôle concerne l'endpoint
  S3, pas la configuration d'éventuels domaines publics du bucket.
- `npm audit --omit=dev` : zéro vulnérabilité connue. L'audit complet indique
  5 alertes élevées **dans les outils de lint** via `braces` 3.0.3. Le registre
  ne propose pas de version corrigée de cette dépendance ; aucun `audit fix
  --force` ni rétrogradation majeure de Next n'a été appliqué.

### Recette avant publication

Le parcours OTP/reconnexion a déjà été confirmé par l'utilisateur. Les tests
présents n'envoient pas un nouveau code et ne déconnectent pas sa session.
L'organisateur doit encore essayer visuellement son panneau avec son propre
compte et ouvrir son ZIP final après une clôture intentionnelle. Le projet
`depart-demo` n'a pas été clôturé pour les tests. L'API organisateur/export a été
testée automatiquement, pas avec une session réelle organisateur dans le navigateur.
La fixture HTTP n'est pas une preuve supplémentaire de RLS Supabase.

Les médias vidéo/audio/HEIC dépendent des codecs du navigateur : leur liste MIME
et leurs limites sont testées, mais seul l'aperçu PNG a été vérifié visuellement.
Avant déploiement : origine CORS réelle, configuration URL/OTP, revue consentements
et contenu, et recette mobile avec des fichiers représentatifs.
Voir `13-V1-OPERATIONS.md` pour utilisation, conservation et limites.

Sauvegarde par commits locaux ; aucun push et aucune publication réalisés.

## Création et organisation partagée — 3 octobre 2026

L'utilisateur confirme avoir terminé les cinq étapes de recette du socle :
filtres, masquage/republication, clôture, ouverture du ZIP et réouverture. Cette
confirmation complète la recette organisateur qui restait à faire ci-dessus.

Évolution : création authentifiée du projet et de son organisateur atomique
(0004), informations modifiables, invitation privée d'une deuxième adresse avec
acceptation par son compte à email confirmé (0005). Pas de date de naissance.

Vérifications réalisées :

- `npm run check` réussit : lint sans erreur/avertissement, typecheck, **23 tests
  unitaires**, build Webpack. Une relance a été nécessaire après un verrou EBUSY
  Windows ; aucun fichier utilisateur supprimé.
- **46 assertions SQL** passent sur PostgreSQL 18 isolé : les 21 du socle et
  25 nouvelles couvrant création, rôle initial, collision/identité immuable,
  non-auto-promotion, email privé, mauvaise adresse, adresse non confirmée,
  acceptation idempotente, deuxième organisateur, limite de deux et annulation
  en attente. Fixtures rollbackées et instance arrêtée.
- **55 contrôles d'intégration** passent sur les API compilées, Auth/PostgREST
  locaux et R2 réel : 33 contrôles du socle + 22 de création/paramètres/partage,
  incluant modération des paramètres, clôture/export par le deuxième compte et
  absence de son email dans l'archive. Objets R2 synthétiques nettoyés.
- Dans le navigateur avec la session organisateur réelle : affichage des nouvelles
  rubriques ; modification synthétique titre/nom/présentation, rechargement et
  consultation de la page ; valeurs originales restaurées. Un test de date a
  révélé une lecture d'état React obsolète après saisie native. Le formulaire lit
  désormais les contrôles via FormData à la soumission, avec test de régression.
  Après accord explicite de l'utilisateur, date du 3 octobre persistante au
  rechargement et affichée sur le projet ; ancienne date vide restaurée ensuite.
- `/nouveau` affiche les champs et le message d'activation manquante lors de la
  soumission : aucun projet Supabase créé. À 375 px, contenu 360 px, aucun
  débordement horizontal ; viewport restauré.
- En l'absence de migration 0005 distante, Organisation conserve les fonctions
  existantes et désactive le partage avec une explication.

Une nouvelle tentative SQL avec capture globale de sortie s'est bloquée sur les
handles Windows du serveur temporaire. Cette seule instance a été arrêtée,
puis le script relancé directement : les 46 contrôles ont réussi. Les journaux
temporaires sont conservés pour diagnostic, sans accès à la base utilisateur.

Activation distante encore nécessaire : exécuter 0004 puis 0005 dans Supabase.
Les tests HTTP ne remplacent pas la RLS distante ; la création réelle et le
partage entre deux sessions OTP restent à recetter après cette activation.
La CI est configurée mais pas exécutée sur GitHub (aucun push demandé).
Voir `14-ONBOARDING-REGRESSION.md` pour activation et contrôles répétables.
