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
- Sans destination, utiliser le projet démo configuré, sinon l'unique projet
  public disponible ; avec plusieurs projets, revenir à l'accueil sans en choisir
  arbitrairement un. Les destinations externes ou non reconnues sont rejetées.
- L'en-tête affiche « Connecté » et « Se déconnecter » lorsque la session est
  ouverte, jamais l'email. La déconnexion concerne seulement le navigateur courant.
- Les formulaires de contribution sont remplacés par un accès à la connexion
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

## Mur
Mobile : une colonne.
Desktop : grille fluide.

## Chronologie
Doit tolérer les dates approximatives sans donner une fausse précision.

## Administration
Priorité à une liste claire avec filtres par statut et actions rapides publier/masquer.
