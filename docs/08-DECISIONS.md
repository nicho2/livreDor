# Journal des décisions

## ADR-001 — Supabase pour auth + données structurées
**Décision :** Supabase Free au démarrage.

**Raison :** auth OTP, PostgreSQL, RLS, faible charge opérationnelle.

## ADR-002 — Cloudflare R2 pour les médias
**Décision :** les médias ne sont pas stockés dans Supabase Storage.

**Raison :** séparer les blobs lourds du backend métier et conserver une structure de coûts adaptée aux médias.

## ADR-003 — Multi-projets au niveau du modèle
**Décision :** toutes les données métier sont rattachées à `project_id`.

**Raison :** ne pas enfermer le code dans le seul cas d'un départ en retraite.

## ADR-004 — Contribution et souvenir sont deux objets différents
**Décision :** `guestbook_entries` et `memories` sont séparés.

**Raison :** une personne peut laisser un message unique et plusieurs souvenirs.

## ADR-005 — Auth OTP sans mot de passe
**Décision :** l'utilisateur saisit son email et reçoit un code/lien.

**Raison :** réduire la friction tout en disposant d'une identité technique.

## ADR-006 — Personnalisation bornée
**Décision :** style structuré, pas de HTML/CSS libre.

**Raison :** préserver la cohérence visuelle et éviter les risques XSS.

## ADR-007 — Projet temporaire, restitution durable
**Décision :** le produit doit savoir produire une archive autonome.

**Raison :** le site actif n'a pas vocation à rester en ligne éternellement.

## ADR-008 — Fenêtre de contribution et identité des contenus

**Décision :** les écritures des contributeurs exigent un projet ouvert, une
adhésion et une fenêtre temporelle active. L'organisateur conserve le droit de
modérer après clôture. L'identifiant, le projet et l'auteur d'un contenu ne sont
pas modifiables ; un média ne peut être réaffecté à un autre souvenir ou blob.
La lecture publique exige aussi un projet non brouillon. Un média attaché à un
souvenir non publié n'est pas exposé publiquement.

**Raison :** aligner la RLS avec les contrôles déjà effectués par `join_project`,
empêcher les déplacements inter-projets et préserver une modération immédiate.
La migration `0003_content_access_guards.sql` corrige les politiques initiales ;
elle doit être appliquée à Supabase pour rendre ces protections effectives.

## ADR-009 — Finalisation et lecture privée des médias

**Décision :** chaque média est attaché à un souvenir enregistré. L'API vérifie
la session, l'adhésion, l'auteur du souvenir et la fenêtre de collecte. Une
réservation `draft` précède le PUT signé (5 minutes). Le PUT vise un objet
temporaire, jamais l'objet final : après contrôle de taille et MIME effectifs,
une copie conditionnelle sur l'ETag produit l'objet final. Une preuve HMAC dans
ses métadonnées lie le fichier à sa ligne Supabase. La lecture utilise RLS puis
vérifie cette preuve avant de délivrer un GET signé de 5 minutes. Un média
finalisé suit aussi la visibilité de son souvenir parent. Suppression : masquage
immédiat, puis effacement du fichier final et de son temporaire, avec reprise
possible en cas d'erreur. 20 médias maximum par souvenir dans l'interface/API.

**Raison :** empêcher l'exposition d'uploads inachevés ou de métadonnées forgées,
y compris avec les politiques d'écriture média existantes, et empêcher la
réutilisation d'un PUT signé pour remplacer un fichier déjà validé. Le HMAC
utilise actuellement la clé secrète R2 : une rotation exige de re-signer les
métadonnées des objets existants avec l'ancienne clé avant son retrait.
Les URLs déjà délivrées restent utilisables jusqu'à expiration (au plus 5 minutes).
Ce contrôle ne constitue pas une analyse antivirus ; le HTML/SVG est refusé.

## ADR-010 — Archive finale et séparation des données privées

**Décision :** l'export final exige un projet `closed` ou `archived` et un rôle
organisateur vérifié côté serveur. Le ZIP sépare `site/` (seuls contenus publiés,
médias locaux, HTML/CSS sans backend ni JavaScript) et `archive-privee/`
(JSON de tous les contenus et médias privés disponibles, sans emails).
Le README avertit de ne publier que `site/`. Les fichiers publiés absents
font échouer l'export ; les fichiers supprimés/non finalisés sont signalés dans
un manifeste. Le ZIP et les médias sont envoyés par flux, sans accumulation
de l'archive côté serveur. La modération reste possible après clôture.

**Raison :** éviter qu'une sauvegarde complète expose les brouillons ou contenus
masqués et garantir une restitution réellement utilisable hors ligne.
`archiver` est la seule dépendance ajoutée pour gérer le ZIP en streaming.

## ADR-011 — Serveur local stable sous Windows

**Décision :** `npm run dev` et `npm run build` utilisent Webpack. Le mode
Turbopack reste accessible avec `npm run dev:turbo`.

**Raison :** le 3 octobre 2026, Turbopack a paniqué sur un fichier source-map
verrouillé (erreur Windows 32). Webpack permet de continuer les validations.
Toujours arrêter le serveur avant un build ; ne pas supprimer les sources,
ni désactiver les protections Windows pour contourner un verrouillage.

## ADR-012 — Création guidée et informations du projet

**Décision :** après OTP, `/nouveau` permet de créer un projet et son adhésion
organisateur dans une seule transaction PostgreSQL (`create_project`, migration
0004). Le créateur provient uniquement de `auth.uid()`, jamais du formulaire.
Le nouveau projet est `open`, avec avertissement explicite de visibilité des
informations. La création ne confère aucun droit sur un projet existant et une
collision de slug échoue sans le modifier. Le slug, l'ID et le créateur restent
immuables. L'organisateur peut modifier titre, nom affiché, présentation et date
d'événement ; validation Zod bornée et contrôle de rôle côté serveur.

**Raison :** supprimer la configuration SQL manuelle pour chaque projet, tout
en respectant le modèle multi-projets et les droits existants. Le nom affiché
reste un champ libre unique (personne ou événement) ; pas de date de naissance
collectée sans besoin validé. Les champs secondaires sont facultatifs.

## ADR-013 — Deux organisateurs, invitation par adresse vérifiée

**Décision :** un organisateur peut enregistrer une invitation privée pour une
deuxième adresse, y compris sans compte existant. La personne reçoit le lien
du projet par l'organisateur et se connecte via son propre OTP. Aucun email
d'invitation automatique. La RPC d'acceptation lit l'email **confirmé** du compte
dans `auth.users`, jamais une adresse déclarée dans une requête. Lors de l'ouverture
du projet ou de son administration, l'invitation correspondante est acceptée.
Le projet est verrouillé pendant invitation/acceptation ; deux organisateurs
maximum. Les droits sont identiques, pour ce seul projet. Une invitation en
attente est remplaçable/annulable ; une invitation acceptée ne l'est pas dans
l'interface V1. Une révocation exceptionnelle nécessite une intervention contrôlée.

**Raison :** partager simplement la responsabilité sans ajouter une gestion
complexe de rôles. La table `project_organizer_invites` est réservée aux
organisateurs, ne figure pas dans les exports et ne révèle rien aux tiers.
La migration 0005 est nécessaire. Aucun compte n'est créé ni recherché par
email via une API administrateur, aucune promotion générale n'est possible.

## ADR-014 — SMTP Resend et outil de recette synthétique séparé

**Décision :** documenter Resend comme transport SMTP des OTP Supabase, sans
nouvelle dépendance applicative ni invitation email automatique. Les modèles
Supabase restent responsables du code ; pas de tracking des emails Auth.

Le jeu synthétique est un outil local d'opérateur, pas une API publique. Il exige
un projet TEST dédié déjà créé, ouvert, un slug test- et une session organisateur
OTP contrôlée par l'API du site cible. La clé service locale ne sert qu'à préparer
quatre identités Auth fictives sans email ni mot de passe ; cette exception de
recette ne modifie pas le flux produit de l'ADR-013. Contributions sous sessions
contributeurs/RLS, médias via pré-signature/PUT/finalisation normaux. Aucun seed
distant exécuté pendant le développement, aucune clé supplémentaire côté client.

**Raison :** permettre une recette reproductible multi-auteurs dès le premier
projet de test en ligne, sans réutiliser les emails ni souvenirs réels. ID stables,
pas d'écrasement des edits/modérations, aperçu sans réseau et protections contre
les cibles réelles. Les données de recette sont conservées après interruption ;
une purge complète demande une opération séparée explicitement autorisée.

## ADR-015 — Plafond global des projets pour la capacité média

**Décision :** `LIVREDOR_MAX_PROJECTS`, uniquement serveur, vaut 3 par défaut ;
entier de 0 à 10000, zéro suspend la création. Compter tous les projets de la
base, y compris drafts, fermés et archivés : les médias sont encore conservés.
Aucun projet existant supprimé si la limite baisse ; modifier/contribuer/exporter
sur un projet existant reste possible selon les règles habituelles.

La migration 0006 retire l'accès client à l'ancienne RPC `create_project`.
L'API vérifie la session puis appelle `create_project_limited`, exécutable
uniquement par `service_role`. Le créateur est issu de cette session vérifiée,
pas du JSON, et le plafond vient de l'environnement serveur. Cela remplace
l'appel utilisateur de l'ADR-012 pour empêcher une limite fournie par le navigateur.
Un verrou transactionnel global PostgreSQL sérialise comptage et création, même
entre utilisateurs/serveurs concurrents ; projet et organisateur restent atomiques.
Les administrateurs DB/clés service restent des opérateurs privilégiés.

**Raison :** empêcher une quatrième création lorsque trois espaces existent,
sans modifier les rôles ni le parcours OTP. Un simple count côté API ne protège
pas des courses ni d'un appel direct Supabase. Ce plafond n'est pas un quota
d'octets ni un dispositif anti-abus complet : quelques projets peuvent encore
accumuler de nombreux médias. Tous les serveurs d'une même base doivent utiliser
la même valeur ; une base distincte a son propre plafond.

## ADR-016 — Hébergement Sites et compilation dédiée Workers

**Décision :** l'utilisateur choisit OpenAI Sites et autorise l'accès par lien
sans connexion ChatGPT. Conserver Next.js/Webpack pour le développement local ;
ajouter une compilation Vinext/Cloudflare Workers dédiée à l'hébergement.
Supabase OTP/RLS, les API de contrôle et le bucket R2 privé existant restent
inchangés. Aucun remplacement par D1, aucun rôle issu des en-têtes Sites.
Les secrets sont configurés dans Sites, jamais dans le manifeste de source.

**Raison :** Sites attend un Worker ESM, pas un serveur `next start` ni un simple
export statique. Cette adaptation doit être validée avant de présenter la V1
hébergée comme exploitable ; particulièrement ZIP en flux et SDK R2.

## ADR-017 — Connexion LivreDor obligatoire aussi pour consulter

**Décision :** à la demande de l'utilisateur le 3 octobre 2026, supprimer la
lecture anonyme de l'application active. L'accueil et `/auth` restent publics,
mais ni annuaire ni information de projet ni contenu n'y est chargé sans session.
La migration 0007 réserve les quatre politiques de lecture aux comptes
`authenticated`. Les droits auteur/organisateur et les fenêtres de contribution
sont inchangés. `published` désigne un contenu partagé avec les comptes connectés,
pas une publication publique sur Internet. Cela remplace la lecture publique
des ADR-008/012 ; l'accès Sites sans compte ChatGPT de l'ADR-016 reste valable.

Les pages projet ne préchargent plus de données via un client anonyme serveur :
elles chargent sous session dans le navigateur avec RLS, sans données personnelles
dans le HTML/RSC. Les composants sont démontés à la déconnexion et recréés lors
d'un changement de compte. L'API média exige une session vérifiée avant toute
lecture/signature. Les URLs signées déjà délivrées expirent sous cinq minutes.

**Raison :** l'utilisateur refuse que les souvenirs soient consultables sans OTP.
Masquer les boutons ne suffit pas : une API Supabase directe doit aussi refuser
la lecture anonyme. Tests SQL réels des quatre tables, tests HTML/RSC sans données
et refus média sans jeton/avec jeton invalide préviennent une régression.
La V1 n'ajoute pas une liste d'invités nominative : tout compte authentifié peut
encore lire les contenus publiés des projets non brouillons. L'export statique
reste autonome et n'est public que si l'organisateur le diffuse séparément.


## ADR-018 — Album chaleureux et vues partagées

**Décision :** introduire une identité crème/ivoire/terracotta pilotée par des
variables CSS (couleurs, polices, espacements, rayons, ombres, durées). Une
ambiance Classique permet de vérifier la substitution des tokens. Le sélecteur
est une préférence locale du navigateur, facultative et sans donnée personnelle,
non un réglage partagé du projet. Le choix d'un thème par l'organisateur reste
une évolution ultérieure : aucune migration ni nouveau champ métier à ce stade.

`GuestBookPage` rend les mêmes données structurées dans la grille, le livre et
l'aperçu de saisie. Le livre montre deux pages dès 768 px, une page en dessous,
avec boutons, clavier et glissement tactile. Les médias restent exclusivement
attachés aux souvenirs, comme dans le modèle actuel ; l'aperçu du message montre
son texte et son formatage, sans inventer une association photo/message.

`MemoryCollection` partage ses cartes entre mur et chronologie. Celle-ci exclut
les souvenirs sans date/période, qui restent sur le mur. `MemoryDetail` est
partagé par la route détail et le dialogue `MemoryViewer` ; les liens existants
vers les détails restent valables. Le dialogue natif fournit confinement du
focus, Échap et restitution du focus. `MediaGallery` conserve les uploads et
lectures privées existants, avec galerie, miniatures, zoom et lecture audio/vidéo.
Les fichiers HEIC/HEIF restent téléchargeables si le navigateur ne les décode pas.

Les cartes sont affichées par lots de 24 ; une requête de métadonnées par lot
évite une requête par souvenir et les signatures des aperçus sont demandées à
l'approche du viewport. Les données textuelles restent chargées pour le projet ;
ce choix vise plusieurs centaines de souvenirs, pas une pagination serveur de
collections illimitées. Le lecteur charge au plus les 20 fichiers autorisés.
Les animations sont ponctuelles et neutralisées avec prefers-reduced-motion.

**Raison :** enrichir la consultation et rendre l'édition prévisible, sans
changer OTP, Supabase/RLS, R2 privé, rôles, statuts ni export autonome. Le site
statique conserve son rendu autonome existant ; les interactions React de
l'application active ne sont pas ajoutées implicitement à l'archive.

## ADR-019 — Thème partagé et version visible

Le 4 octobre 2026, l'utilisateur demande un choix d'ambiance par l'organisateur
et de nouveaux skins. La migration 0008 ajoute `projects.theme`, borné à huit
valeurs : album, classic, retirement, birthday, wedding, departure, birth,
memory. Les projets existants prennent Album chaleureux. Le choix partagé
remplace la préférence locale de l'ADR-018 ; il se modifie dans Organisation
après contrôle organisateur, s'applique aux vues et à l'export autonome.
Les tokens prédéfinis restent la seule source de CSS du thème.

Le pied de page de l'application affiche la version issue de `package.json` ;
la livraison préparée est 0.1.1. Aucun numéro dupliqué dans les composants.

## ADR-020 — Création réservée aux gestionnaires du site

L'accueil conserve les projets accessibles sous session/RLS, sans bouton de
création. `/all` présente les outils de création aux gestionnaires connectés ;
`/nouveau` et `POST /api/projects` contrôlent également cette autorisation.
`LIVREDOR_SITE_MANAGERS`, exclusivement serveur, contient les adresses exactes
autorisées, séparées par des virgules. L'email doit être confirmé par Supabase.
Une configuration vide refuse toutes les créations ; ni rôle ni email fournis
par le navigateur ne peuvent attribuer ce droit. Le premier gestionnaire a été
confirmé par l'utilisateur et configuré localement, hors Git.

Cela remplace la création par tout compte connecté des ADR-012/015, sans changer
les rôles par projet : un gestionnaire devient organisateur de ses créations,
mais n'est pas automatiquement organisateur des autres projets. La RPC de quota
reste uniquement serveur ; le plafond global reste inchangé. `/all` est un accès
discret, pas une protection par secret d'URL. Aucun compte Auth n'est supprimé
ou modifié pour administrer un projet.

## ADR-021 — Suppression définitive après restitution

La zone de danger en bas d'Organisation exige le statut existant `archived`,
un export complet enregistré côté serveur, la confirmation que le ZIP est
sauvegardé et le slug recopié. L'archivage exige désormais une clôture préalable
et un export réussi. Aucun nouveau statut métier n'est introduit.

La migration 0008 conserve `content_revision`, `archive_exported_at` et
`deletion_started_at`. L'export est confirmé uniquement à la fin du flux ZIP et
si sa révision est encore actuelle ; erreurs et interruptions ne donnent aucun
droit de suppression. Contenus, thème, informations ou réouverture invalident
la preuve, y compris les écritures directes Supabase par RLS. Les champs protégés
et RPC de preuve/suppression ne sont pas modifiables par un client.

Une RPC vérifie organisateur, état et slug sous verrou, puis bloque les mutations
et la réouverture. Les ajouts média récents imposent dix minutes d'attente avant
le début du nettoyage (les URL PUT sont valables cinq minutes) ; leur date n'est
pas modifiable. Le serveur nettoie le préfixe R2 UUID exact du projet, y compris
staging et orphelins, par lots de 1000 relus depuis le début. Une erreur ou un
échec partiel conserve les lignes et le verrou, permettant la reprise. La
suppression PostgreSQL avec cascades intervient seulement après nettoyage R2.
Les comptes/profils et les autres projets sont conservés.

Il n'y a pas de transaction distribuée R2/PostgreSQL : la reprise est explicite.
Les URL GET déjà délivrées expirent sous cinq minutes ; les copies de ZIP déjà
enregistrées par les organisateurs restent sur leurs propres supports. Les
clients sont invités à vérifier le ZIP : le serveur atteste sa génération,
pas son enregistrement sur le disque de l'utilisateur.

## ADR-022 — Organisateur désigné dès la création

Le gestionnaire peut renseigner une adresse organisateur dans le formulaire de
création. La RPC serveur 0009 crée le projet sous le quota existant et son
invitation privée dans une transaction. L'acceptation réutilise ADR-013 : email
confirmé par OTP, compte pouvant être créé plus tard, droits limités au projet,
deux organisateurs maximum et aucun email d'invitation automatique.
Le gestionnaire conserve les droits organisateur du projet qu'il crée ; le
champ est facultatif. Sa propre adresse ne produit pas une invitation inutile.
Cette évolution facilite la remise du projet à son organisateur sans ajouter
un rôle global, une recherche de compte par email ou une nouvelle table.
