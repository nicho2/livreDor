# LivreDor — Starter Kit

Socle de départ du projet **LivreDor**, préparé pour être repris localement avec Codex ou un autre agent de développement.

## Objectif
Créer une expérience collective permettant de préparer un souvenir numérique pour une personne ou un événement : livre d'or, souvenirs, médias, chronologie et restitution finale.

## Stack retenue
- Next.js / React / TypeScript
- Supabase Auth (OTP email)
- PostgreSQL Supabase + RLS
- Cloudflare R2 pour les médias
- AWS SDK S3 pour signer les uploads R2
- Zod pour valider les entrées

## Démarrage local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Puis ouvrir `http://localhost:3000`.

Avant de commiter une évolution :

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

L'accueil et l'écran de connexion peuvent être contrôlés sans backend. Le
parcours complet projet → OTP → contribution → mur nécessite une configuration
Supabase de développement et l'application de toutes les migrations.

## Configuration Supabase
1. Créer un projet Supabase.
2. Renseigner `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Appliquer, dans l'ordre, les migrations de `supabase/migrations/`.
4. Activer l'authentification par email OTP.
5. Ajouter l'URL locale et l'URL de production dans les URL de redirection autorisées.

Pour recevoir un code dès la première connexion, inclure `{{ .Token }}` dans
les deux modèles d'email Supabase : **Confirm sign up** et **Magic link or OTP**.
Le premier sert à l'inscription, le second aux connexions suivantes. Le code
utilise `signInWithOtp` puis `verifyOtp` avec `type: "email"`.

Voir `docs/10-LOCAL-VALIDATION.md` pour les vérifications de développement.
Pour un contrôle du navigateur Codex en panne après une mise à jour, voir
`docs/11-BROWSER-TROUBLESHOOTING.md`.

### Tests locaux de sécurité

Les tests unitaires utilisent le lanceur intégré de Node.js (Node 22.18+ ou 24).
Sous Windows, avec `initdb`, `pg_ctl` et `psql` dans le PATH :

```powershell
./scripts/test-rls-local.ps1
```

Ce script crée une instance PostgreSQL isolée sur la boucle locale, applique les
migrations et teste les accès avec les rôles `anon` et `authenticated`. Il ne
contacte pas Supabase et n'utilise aucune clé. Il arrête l'instance à la fin ; les
fichiers temporaires et journaux sont conservés pour diagnostic. Le sandbox
Windows peut empêcher son démarrage et nécessiter une autorisation d'exécution.
Le schéma `auth` minimal de test ne remplace pas une vérification sur Supabase.

Après application des migrations à une **base Supabase de développement**, le
fichier `tests/sql/content-access.sql` peut aussi être exécuté dans l'éditeur SQL
avec un rôle administrateur. Ses données fictives sont annulées par `ROLLBACK` ;
il doit être exécuté en entier et pas sur une base de production.

## Configuration Cloudflare R2
1. Créer un bucket privé.
2. Créer des credentials API R2 avec accès au bucket.
3. Renseigner les variables R2 dans `.env.local`.
4. Ne jamais exposer les credentials R2 côté client.

## Structure

```text
.
├── AGENTS.md                  # Instructions prioritaires pour Codex/agents
├── README.md
├── docs/                      # Spécification et décisions produit
├── supabase/migrations/       # Schéma SQL + RLS
├── src/app/                   # Routes Next.js
├── src/components/            # Composants UI
├── src/lib/                   # Clients Supabase, validation, R2
├── scripts/                   # Outils de préparation/export
└── .env.example
```

## État du socle
Ce dépôt est volontairement un **starter**, pas une application finalisée. Il contient :
- une architecture exploitable ;
- le modèle de données initial ;
- les politiques RLS de base ;
- l'authentification OTP ;
- le flux de contribution principal ;
- le mécanisme de pré-signature R2 ;
- les écrans de base mur/chronologie/admin ;
- une documentation suffisamment précise pour permettre à un agent de poursuivre sans réinterpréter le besoin.

## Ordre de travail recommandé
1. Faire fonctionner Supabase local/remote.
2. Valider le parcours OTP.
3. Créer un premier projet de démonstration.
4. Finaliser contribution + mémoire.
5. Finaliser upload R2.
6. Construire le mur.
7. Construire la chronologie.
8. Construire l'administration.
9. Construire l'export final.

Voir `docs/06-BACKLOG.md`.
