# Architecture technique

## Vue d'ensemble

```text
Navigateur
   |
   v
Next.js / OpenAI Site
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
Le code est organisé pour un déploiement Next.js standard. Si la cible OpenAI Site impose des restrictions de runtime, conserver le frontend et déplacer les routes serveur vers une fonction Supabase ou un Worker Cloudflare. Le contrat API peut rester identique.
