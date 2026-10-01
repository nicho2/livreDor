# Spécification fonctionnelle V1

## 1. Projet
Chaque espace LivreDor correspond à un `project`.

Champs essentiels :
- titre ;
- slug ;
- bénéficiaire / sujet ;
- description courte ;
- date de l'événement ;
- date d'ouverture des contributions ;
- date de clôture ;
- statut du projet ;
- thème visuel minimal.

Le modèle est multi-projets dès le départ.

## 2. Accès et authentification
### Objectif
Éviter les mots de passe tout en conservant une identité technique minimale.

### Parcours
1. l'utilisateur saisit son email ;
2. Supabase envoie un OTP / magic code ;
3. l'utilisateur valide ;
4. il rejoint ou consulte le projet ;
5. ses contributions sont reliées à son compte Supabase.

L'email n'apparaît jamais sur les pages publiques.

## 3. Profil contributeur
Données minimales :
- prénom / nom ou nom affiché ;
- relation libre avec le bénéficiaire, facultative ;
- date/période de rencontre, facultative.

## 4. Livre d'or
Un utilisateur peut rédiger un message principal.

Fonctions V1 :
- texte ;
- emojis ;
- gras ;
- italique ;
- alignement ;
- 4 à 5 polices prédéfinies ;
- 3 tailles prédéfinies ;
- palette de couleurs prédéfinie.

Le rendu est stocké sous forme structurée et non comme HTML libre.

## 5. Souvenirs
Un utilisateur peut ajouter zéro, un ou plusieurs souvenirs distincts de son message de livre d'or.

Un souvenir contient :
- titre facultatif ;
- texte ;
- date exacte facultative ;
- ou année/période facultative ;
- médias facultatifs ;
- statut de publication.

## 6. Médias
Types V1 :
- image ;
- vidéo ;
- audio ;
- document.

Limites initiales recommandées :
- image : 15 Mo ;
- audio : 50 Mo ;
- vidéo : 200 Mo ;
- document : 25 Mo.

Ces valeurs doivent être configurables.

## 7. Mur des souvenirs
Le mur agrège les souvenirs publiés sous forme de cartes.

Minimum V1 :
- auteur affiché ;
- date/période ;
- texte court ;
- média principal ;
- ouverture du détail.

Filtres ultérieurs possibles : année, personne, type de média.

## 8. Chronologie
Les souvenirs avec date/période sont projetés sur une chronologie.

La chronologie doit accepter les données imprécises :
- date exacte ;
- année seule ;
- période `de` / `à`.

## 9. Administration
Rôle organisateur minimal :
- voir toutes les contributions ;
- publier ;
- masquer ;
- supprimer un média ;
- corriger le nom affiché ;
- clôturer le projet ;
- lancer l'export.

Pas de workflow éditorial complexe en V1.

## 10. Publication
Statuts autorisés :
- `draft`
- `published`
- `hidden`

## 11. Restitution finale
À la clôture, produire :
1. un site statique consultable hors de l'application ;
2. une archive complète ZIP ;
3. ultérieurement un PDF/livre souvenir.

## 12. Critères de réussite V1
- contribution simple possible en moins d'une minute ;
- expérience correcte sur mobile ;
- aucune adresse email visible ;
- médias stockés hors PostgreSQL ;
- projet exportable sans dépendance irréversible à la plateforme ;
- l'organisateur garde le contrôle de la publication.
