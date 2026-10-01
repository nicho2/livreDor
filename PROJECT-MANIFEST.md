# Manifest du kit LivreDor

## Documentation incluse
- `AGENTS.md` : règles prioritaires pour Codex/agents.
- `CODEX-START-HERE.md` : point d'entrée opérationnel.
- `docs/00-VISION.md` : intention produit.
- `docs/01-PRODUCT-SPEC.md` : spécification fonctionnelle V1.
- `docs/02-ARCHITECTURE.md` : architecture Supabase + R2 + Next.js.
- `docs/03-DATA-MODEL.md` : modèle métier.
- `docs/04-UX-FLOWS.md` : parcours utilisateur.
- `docs/05-SECURITY-PRIVACY.md` : sécurité et vie privée.
- `docs/06-BACKLOG.md` : ordre recommandé de développement.
- `docs/07-EXPORT-ARCHIVE.md` : restitution finale.
- `docs/08-DECISIONS.md` : décisions architecturales figées.
- `docs/09-CODEX-PROMPT.md` : prompt de reprise conseillé.

## Code inclus
- Next.js / TypeScript minimal.
- Authentification Supabase OTP.
- Page projet, contribution, mur, chronologie et squelette admin.
- Validation de médias.
- Endpoint de pré-signature Cloudflare R2.
- Schéma PostgreSQL complet de départ.
- RLS de base.
- RPC d'adhésion à un projet ouvert.
- Script SQL de création d'un projet de démonstration.
- Squelette d'export final.

## À terminer par l'agent
- CRUD complet des souvenirs.
- Upload R2 côté UI + enregistrement de `media_assets`.
- URL GET signée pour lecture des médias privés.
- Administration avec contrôle serveur du rôle organisateur.
- Export JSON + médias + site statique.
- Tests automatiques et tests RLS.
- Validation finale sur l'environnement de déploiement OpenAI Site.

## État de vérification
- Structure du repository : vérifiée.
- `package.json` : JSON valide.
- Présence des fichiers critiques : vérifiée.
- `npm install` / compilation complète : non validés dans l'environnement de génération, l'installation npm ayant dépassé la fenêtre d'exécution disponible. À exécuter en première étape sur le PC cible.
