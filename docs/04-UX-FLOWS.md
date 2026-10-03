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
  connexion. Aucune recherche anonyme d'un projet démo ou unique. Les destinations
  externes ou non reconnues sont rejetées ; les détails de souvenirs UUID sont acceptés.
- L'en-tête affiche « Connecté » et « Se déconnecter » lorsque la session est
  ouverte, jamais l'email. La déconnexion concerne seulement le navigateur courant.
- Les projets, leurs publications et les formulaires sont remplacés par un accès à la connexion
  lorsque la session est absente. Ce contrôle UX ne remplace pas la RLS.

## Écran projet
Doit immédiatement expliquer :
- pour qui est le LivreDor ;
- à quelle occasion ;
- comment contribuer ;
- quand les contributions ferment.

CTA principal : `Laisser un message`.

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

## Mur
Mobile : une colonne.
Desktop : grille fluide.

## Chronologie
Doit tolérer les dates approximatives sans donner une fausse précision.

## Administration
Priorité à une liste claire avec filtres par statut et actions rapides publier/masquer.

## Démarrage organisateur

Accueil → Créer un LivreDor → email/OTP si nécessaire → titre et nom affiché,
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
