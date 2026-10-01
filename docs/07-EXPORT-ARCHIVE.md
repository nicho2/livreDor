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
Le PDF imprimable est une évolution post-V1. L'architecture doit néanmoins conserver suffisamment de structure pour générer ultérieurement une maquette : auteur, date, texte, média principal, ordre chronologique.
