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

La V1 est implémentée et la release 0.1.3 est publiée (version Sites 8).
Ne pas recommencer la mise en route sur la base existante. Lire `README.md`,
`docs/README.md`, `docs/10-LOCAL-VALIDATION.md` et `docs/20-GESTION-THEMES-SUPPRESSION.md`
pour les preuves et contrôles restants. Les migrations 0001–0009 sont appliquées
sur le Supabase configuré, selon le registre de déploiement. OTP et deuxième
organisateur sont validés localement. Le parcours souvenir 0.1.2 est aussi validé
en ligne sur TEST : création avec photo/audio/vidéo, publication directe et focus
mobile. Voir `docs/21-RELEASE-0.1.2.md`.
Installation avec Resend : `docs/15-INSTALLATION-RESEND.md`.
Alimentation d'un projet TEST dédié : `docs/16-SYNTHETIC-SEED.md`.
Déploiement Sites public effectué ; voir `docs/17-SITES-DEPLOYMENT.md` pour
les preuves, CORS R2 validé, upload en ligne vérifié et nouveau cycle OTP à valider.
Aucun push, déploiement ou seed distant sans demande explicite.
Correction ADR-017 appliquée à Supabase, conservée dans la release actuelle :
consultation réservée aux sessions OTP, lectures anonymes directes vérifiées
sur les quatre tables. Recette navigateur avec session réelle confirmée pour
le parcours souvenir ; nouveau cycle OTP et deuxième compte encore à vérifier.

## Première mission du socle (historique / nouvelle instance)
1. Vérifier que le projet compile.
2. Connecter un projet Supabase de développement.
3. Appliquer `supabase/migrations/0001_initial_schema.sql`.
4. Configurer l'OTP email.
5. Créer un projet de démonstration.
6. Vérifier le parcours : projet → connexion → contribution → mur.
7. Corriger les défauts du starter sans modifier les décisions produit.

## Ensuite
Terminer les contrôles ouverts du backlog : recette complémentaire à deux comptes,
codecs représentatifs, accessibilité et performance sur téléphone réel,
information des participants et conservation. Le contrôle Supabase en lecture
seule et les tests RLS isolés passent. CRUD souvenirs, upload, administration et
export sont déjà implémentés ; ne pas les recréer.

## Important
Les validations locales ne prouvent pas à elles seules chaque parcours sur
l'hébergement. Ne contourne pas RLS ou l'authentification pour faire marcher une démo.
