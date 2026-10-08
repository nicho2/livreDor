# Parcours UX

## Parcours contributeur minimal

```text
Lien projet
  ↓
Email
  ↓
OTP
  ↓
Écrire un message
  ↓
[Option] Ajouter un souvenir
  ↓
[Option] Ajouter un média
  ↓
Publier / enregistrer
```

## Règle de progressivité
Ne pas afficher d'emblée un long formulaire. Le message principal doit être l'action centrale. Les souvenirs et médias sont des enrichissements facultatifs.

## Retour après connexion

- Un lien de connexion depuis un projet conserve sa destination dans `next`.
- Après validation du code, retour automatique vers cette destination locale.
- Une session déjà ouverte ne nécessite pas de saisir à nouveau un code.
- Sans destination, revenir à l'accueil dont les projets se chargent après
  connexion, limités aux projets dont le compte est membre (ADR-026). Aucune recherche anonyme d'un projet démo ou unique. Les destinations
  externes ou non reconnues sont rejetées ; les détails de souvenirs UUID sont acceptés.
- L'en-tête affiche « Connecté » et « Se déconnecter » lorsque la session est
  ouverte, jamais l'email. La déconnexion concerne seulement le navigateur courant.
- Les projets, leurs publications et les formulaires sont remplacés par un accès à la connexion
  lorsque la session est absente. Ce contrôle UX ne remplace pas la RLS.

## Écran projet

Le lien partagé `/p/<slug>?invitation=<code>` conserve son code pendant l’OTP.
Après validation, le compte rejoint le projet et le code est retiré de l’URL.
Une session existante ne demande pas de nouvel OTP. L’accès est ensuite conservé
sur tous les appareils utilisant ce compte. Sans appartenance ni invitation valide,
aucune métadonnée n’est affichée. Sans projet rejoint, l’accueil invite à ouvrir
le lien transmis par l’organisateur. Les liens renouvelés et les collectes fermées
ne permettent plus de nouvelles adhésions ; les membres gardent leur accès.

Doit immédiatement expliquer :
- pour qui est le LivreDor ;
- à quelle occasion ;
- comment contribuer ;
- quand les contributions ferment.

CTA principal : `Laisser un message`.

« Étapes et contact » explique collecte, visibilité, clôture, export et suppression
de l'hébergement au plus tard trois mois après l'événement. Le destinataire garde
la restitution. Un rappel court précède les formulaires de contribution.
Le contact privé notifie les organisateurs par Resend sans exposer leurs adresses
au navigateur. Leur réponse utilise l'email confirmé du contributeur, annoncé
avant envoi. Les erreurs conservent le texte ; une reprise du même message utilise
la même clé tant que le formulaire reste ouvert. Après rechargement, consulter
l'historique avant d'envoyer à nouveau. Les demandes et leur confirmation de lecture
sont consultables dans Organisation, hors du livre d'or et des exports.

## Éditeur de message
La barre de personnalisation doit rester petite. Préférer boutons prédéfinis à des paramètres libres.

## Ajout d'un souvenir
Champs :
- titre ;
- anecdote ;
- date/période ;
- média ;
- aperçu.

Le nom affiché est prérempli à partir du dernier souvenir de l'utilisateur dans
ce projet, puis de son message principal ou de son profil si nécessaire. Il reste
modifiable et n'est jamais déduit de l'email. Un nom enregistré dans le message
ou un souvenir est proposé pour les souvenirs suivants sur la même page.
Une modification manuelle, même l'effacement du champ, n'est pas écrasée par
l'arrivée d'une suggestion. Modifier un souvenir conserve son propre nom.
Le bouton « Modifier » remplit le formulaire, fait défiler la page vers son titre
et y place le focus clavier. Le défilement est immédiat si la réduction des
animations est activée, pour rendre le passage en édition visible et accessible.
Les médias peuvent être sélectionnés dès le formulaire de création. À
l'enregistrement, le souvenir est conservé en brouillon pendant l'envoi ;
« Publier » ne le rend visible qu'après finalisation de tous les fichiers.
En cas d'échec, le formulaire et les fichiers restant à envoyer sont conservés
dans la page ; les fichiers déjà envoyés restent attachés au brouillon.
Un brouillon enregistré peut aussi être publié directement depuis sa carte.

Dans Mes contributions, « Supprimer » efface définitivement le souvenir et ses
fichiers de LivreDor après confirmation. Les souvenirs masqués restent visibles
à leur auteur avec ce bouton, sans action de republication. Si le stockage échoue,
la carte « Suppression à terminer » propose « Réessayer la suppression ». Seul un
envoi non terminé datant de moins de dix minutes demande d'attendre. Une image
déjà envoyée ou retirée ne retarde pas la suppression (migration 0012).
Organisation conserve ses actions publier/masquer ; masquer ne détruit rien.

## Livre d'or
La navigation et l'accueil du projet donnent accès à `/p/[slug]/guestbook`.
Cette vue affiche uniquement les messages principaux publiés, du plus récent au
plus ancien, avec leur nom affiché et leur mise en forme bornée. Elle exige la
connexion LivreDor et applique la RLS existante. Les brouillons et messages
masqués restent dans les espaces auteur/organisateur.

## Mur
Le mur affiche uniquement les souvenirs (anecdotes et médias), sans messages
principaux du livre d'or, conformément à ADR-004.
Mobile : une colonne.
Desktop : grille fluide.

## Chronologie
Doit tolérer les dates approximatives sans donner une fausse précision.

## Administration
Priorité à une liste claire avec filtres par statut et actions rapides publier/masquer.

## Démarrage organisateur

/all → email/OTP si nécessaire → accès gestionnaire → Créer un LivreDor → titre et nom affiché,
présentation/date facultatives, choix du lien stable → création → Organisation.
Le retour OTP accepte explicitement `/nouveau`, sans élargir les redirections
aux chemins arbitraires. La collecte commence ouverte ; les informations du
projet ne sont consultables qu'après connexion LivreDor, comme indiqué dans le formulaire.

Organisation permet de modifier les informations sans changer le lien partagé.
La date d'événement apparaît sur la page projet et le site statique final.

## Deuxième organisateur

Organisation → saisir l'adresse email exacte → invitation en attente → transmettre
le lien du projet → connexion OTP de l'invité → droits organisateur attribués
uniquement si son adresse est confirmée et correspond à l'invitation.
L'email apparaît seulement dans Organisation, jamais sur le mur ou dans le ZIP.
Une invitation en attente peut être annulée ou remplacée, pas une acceptation.
