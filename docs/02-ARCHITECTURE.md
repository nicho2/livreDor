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

Depuis la préparation 0.1.3, `POST /api/projects/[id]/contact` vérifie la session
et l'appartenance, enregistre une demande privée dans Supabase, puis notifie les
organisateurs via Resend. Destinataires et clés restent côté serveur ; le navigateur
ne choisit pas les adresses. `DELETE /api/memories/[id]` utilise les RPC serveur
0011/0012 pour verrouiller le souvenir de l'auteur, nettoyer R2 puis supprimer la
ligne avec cascade des métadonnées. Les erreurs permettent une reprise manuelle.

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
