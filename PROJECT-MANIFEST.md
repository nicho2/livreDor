# Manifest LivreDor — état au 4 octobre 2026

La V1 est implémentée et la release 0.1.3 publiée sur Sites (version 8). Ce manifeste remplace celui du kit initial.

## Documentation

Lire `README.md`, `docs/README.md` et `CODEX-START-HERE.md`. Les décisions sont dans `docs/08-DECISIONS.md`, les preuves dans `docs/10-LOCAL-VALIDATION.md`, les publications dans `docs/17-SITES-DEPLOYMENT.md` et les fonctionnalités 0.1.1 dans `docs/20-GESTION-THEMES-SUPPRESSION.md`.

## Fonctionnalités implémentées

- Next.js, React et TypeScript ; build Sites dédié Vinext/Workers.
- Supabase OTP, PostgreSQL et RLS ; consultation authentifiée.
- Message principal distinct des souvenirs multiples ; brouillon/publication/masquage.
- Médias privés R2 : upload contrôlé, finalisation, lecture signée et suppression.
- Livre feuilletable, mur, détail et chronologie responsive.
- Modération, paramètres et huit thèmes partagés par projet.
- Création réservée aux gestionnaires, quota atomique et organisateur désigné par email.
- Clôture, ZIP autonome et sauvegarde privée, archivage et suppression protégée.
- Tests unitaires, intégration API, navigateur et migrations/RLS PostgreSQL isolés.

## Vérification et prochaines étapes

Audit du 4 octobre : GitHub/main et HEAD avant corrections documentaires correspondent à `105b27a`. Sites confirme la publication réussie de la version 6, issue de `v0.1.1` (`ca426a9`). Lint, typecheck et 47 tests Node relancés avec succès. Les contrôles d'intégration et RLS antérieurs restent consignés dans les registres ; ils n'ont pas été relancés dans cet audit.

Livraison 0.1.2 : commit `175548d`, tag GitHub et deux CI réussies. Lint,
typecheck, 49 tests, 105 contrôles API sur chacun des runtimes et tests RLS
isolés passent. Contrôle RLS Supabase en lecture seule réussi. Recette en ligne
sur TEST : photo/audio/vidéo à la création, publication directe et focus mobile.
Restent la recette complémentaire à deux comptes, les codecs représentatifs,
l'accessibilité et la performance sur téléphone réel, ainsi qu'information et
conservation avant collecte réelle. Voir `docs/06-BACKLOG.md` et le document 22.


Livraison du 6 octobre : release 0.1.3, source `81038b2`, deux CI réussies, Sites 8 et environnement 9. Contrôles publics HTTP réussis ; recette authentifiée et réception email restent à confirmer. Voir documents 17 et 24.
