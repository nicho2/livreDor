# Codex — commencer ici

Tu reprends le projet **LivreDor**.

## Avant de coder
Lis dans cet ordre :
1. `AGENTS.md`
2. `docs/00-VISION.md`
3. `docs/01-PRODUCT-SPEC.md`
4. `docs/02-ARCHITECTURE.md`
5. `docs/03-DATA-MODEL.md`
6. `docs/06-BACKLOG.md`
7. `docs/08-DECISIONS.md`

## État actuel et reprise

La V1 est implémentée et la release 0.1.2 est préparée ; la dernière publication confirmée est 0.1.1 (version Sites 6).
Ne pas recommencer la mise en route sur la base existante. Lire `README.md`,
`docs/README.md`, `docs/10-LOCAL-VALIDATION.md` et `docs/20-GESTION-THEMES-SUPPRESSION.md`
pour les preuves et contrôles restants. Les migrations 0001–0009 sont appliquées
sur le Supabase configuré, selon le registre de déploiement. OTP et deuxième
organisateur sont validés localement ; la recette réelle en ligne de 0.1.1 reste à faire.
Installation avec Resend : `docs/15-INSTALLATION-RESEND.md`.
Alimentation d'un projet TEST dédié : `docs/16-SYNTHETIC-SEED.md`.
Déploiement Sites public effectué ; voir `docs/17-SITES-DEPLOYMENT.md` pour
les preuves, CORS R2 validé et recette OTP/upload en ligne restant à valider.
Aucun push, déploiement ou seed distant sans demande explicite.
Correction ADR-017 appliquée à Supabase, conservée dans la release actuelle :
consultation réservée aux sessions OTP, lectures anonymes directes vérifiées
sur les quatre tables. Recette navigateur avec un vrai OTP restant à confirmer.

## Première mission du socle (historique / nouvelle instance)
1. Vérifier que le projet compile.
2. Connecter un projet Supabase de développement.
3. Appliquer `supabase/migrations/0001_initial_schema.sql`.
4. Configurer l'OTP email.
5. Créer un projet de démonstration.
6. Vérifier le parcours : projet → connexion → contribution → mur.
7. Corriger les défauts du starter sans modifier les décisions produit.

## Ensuite
Terminer les contrôles ouverts du backlog : recette réelle de 0.1.2 en ligne,
RLS sur Supabase de développement, codecs audio/vidéo, accessibilité et performance
mobile, consentement et conservation. CRUD souvenirs, upload, administration et
export sont déjà implémentés ; ne pas les recréer.

## Important
Les validations locales ne prouvent pas à elles seules chaque parcours sur
l'hébergement. Ne contourne pas RLS ou l'authentification pour faire marcher une démo.
