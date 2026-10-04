# Restitution et archivage

## Objectif
Le projet n'a pas vocation à dépendre indéfiniment du service en ligne. La restitution finale doit rester exploitable indépendamment du backend.

## Archive cible

```text
LivreDor-NomProjet/
├── index.html
├── assets/
│   ├── app.css
│   └── app.js
├── data/
│   ├── project.json
│   ├── participants.json
│   ├── guestbook.json
│   ├── memories.json
│   └── media.json
├── media/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── documents/
└── README.txt
```

## Exigences
- aucun lien critique vers Supabase ;
- aucun lien critique vers une URL R2 temporaire ;
- médias copiés dans l'archive ;
- fichiers JSON lisibles ;
- site statique navigable localement ou hébergeable ailleurs.

## Implémentation V1

L'export ZIP organisateur est disponible dans l'interface après clôture.
La structure ci-dessus est séparée en deux dossiers pour protéger les données :
`site/` contient HTML/CSS et médias publiés ; `archive-privee/` contient les JSON
complets et les médias des contenus non publiés. Le `README.txt` racine indique
de ne diffuser que `site/`, jamais la sauvegarde ou le ZIP entier.
Les noms de fichiers utilisent des UUID et extensions contrôlées ; les textes
sont échappés et la mise en forme est limitée aux classes autorisées.
Les fichiers absents/non finalisés sont signalés dans un manifeste. Un fichier
publié manquant provoque une erreur explicite, pas une archive dite complète.
Voir `13-V1-OPERATIONS.md`.

La chronologie du site final contient uniquement les souvenirs datés ou associés
à une période ; les souvenirs sans date restent présents sur le mur, comme dans
l'application. Les médias sont indexés par souvenir pour éviter des parcours
répétés de toute la collection lors de la génération de grandes archives.

Après préparation du ZIP, un lien « Enregistrer le ZIP préparé » reste disponible
sur la page Organisation si le téléchargement automatique ne démarre pas.
La confirmation indique que l'archive est prête : seul le navigateur peut
confirmer l'enregistrement effectif sur disque. Le fichier préparé est libéré
quand l'utilisateur quitte la page ou prépare une nouvelle archive.

Depuis 0.1.1, le thème du projet est conservé dans le JSON privé et le site
autonome. Une génération complète du ZIP enregistre une preuve d'export pour la
révision courante. Clôture → export → archivage permet ensuite une suppression
définitive avec confirmation de sauvegarde et nettoyage R2. Toute modification
des contenus ou du thème invalide cette preuve ; un nouvel export est nécessaire.
Voir [la procédure](20-GESTION-THEMES-SUPPRESSION.md).

## PDF / livre

Le PDF imprimable est une évolution post-V1. L'architecture doit néanmoins conserver suffisamment de structure pour générer ultérieurement une maquette : auteur, date, texte, média principal, ordre chronologique.
