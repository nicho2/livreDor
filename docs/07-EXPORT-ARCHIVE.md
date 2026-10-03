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

## PDF / livre

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
Le PDF/livre imprimable reste hors V1. Voir `13-V1-OPERATIONS.md`.
Le PDF imprimable est une évolution post-V1. L'architecture doit néanmoins conserver suffisamment de structure pour générer ultérieurement une maquette : auteur, date, texte, média principal, ordre chronologique.
