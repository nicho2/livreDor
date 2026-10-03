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

La V1 locale est implémentée ; ne pas recommencer la mise en route sur la base
existante. Lire `README.md`, `docs/README.md` et `docs/10-LOCAL-VALIDATION.md` pour
les preuves et contrôles restants. Les migrations 0001–0007 sont appliquées sur
le Supabase de développement. OTP et deuxième organisateur sont validés.
Installation avec Resend : `docs/15-INSTALLATION-RESEND.md`.
Alimentation d'un projet TEST dédié : `docs/16-SYNTHETIC-SEED.md`.
Déploiement Sites public effectué ; voir `docs/17-SITES-DEPLOYMENT.md` pour
les preuves, CORS R2 validé et recette OTP/upload en ligne restant à valider.
Aucun push, déploiement ou seed distant sans demande explicite.
Correction ADR-017 appliquée à Supabase et publiée sur Sites (version 3) :
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
Implémenter les phases du backlog dans l'ordre, en commençant par le CRUD des souvenirs puis l'upload R2 complet.

## Important
Le code fourni est un **socle**, pas une preuve que chaque intégration externe fonctionne sans configuration. Ne contourne pas RLS ou l'authentification pour faire marcher une démo.
