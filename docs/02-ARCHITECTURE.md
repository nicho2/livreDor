# Architecture technique

## Vue d'ensemble

```text
Navigateur
   |
   v
Next.js (runtime serveur)
   |--------------------------|
   |                          |
   v                          v
Supabase                    API serveur
Auth + PostgreSQL             |
RLS                           v
                          Cloudflare R2
                          médias privés
```

## Responsabilités
### Frontend
- authentification ;
- navigation ;
- formulaires ;
- mur ;
- chronologie ;
- administration.

### Supabase
- Auth OTP ;
- données structurées ;
- relations entre projet, utilisateurs, contributions et souvenirs ;
- RLS.

### Cloudflare R2
- blobs lourds ;
- photos ;
- vidéos ;
- audio ;
- documents.

### API Next.js
La route `POST /api/media/presign` :
1. récupère le bearer token Supabase ;
2. vérifie l'utilisateur ;
3. valide type et taille ;
4. vérifie que l'utilisateur appartient au projet ;
5. génère une clé R2 ;
6. retourne une URL PUT pré-signée.

Le client envoie ensuite directement le fichier vers R2.

## Pourquoi ce découpage
- le serveur applicatif ne transporte pas les gros fichiers ;
- les secrets R2 restent côté serveur ;
- Supabase garde uniquement les métadonnées ;
- l'architecture reste économique et portable.

## Déploiement
Le code vise un déploiement Next.js avec runtime serveur : les signatures R2,
contrôles organisateur et exports ne peuvent pas fonctionner dans un simple
hébergement statique. OpenAI Sites est choisi : compilation dédiée Vinext/Workers,
sans remplacement du développement Next.js local (ADR-016). La réussite d'une
compilation n'atteste pas d'un déploiement ; voir `17-SITES-DEPLOYMENT.md`.
Seul le dossier `site/` de l'export final est autonome et statique.
