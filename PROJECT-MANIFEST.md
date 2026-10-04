# Manifest LivreDor — état au 4 octobre 2026

La V1 est implémentée et la release 0.1.2 préparée pour publication. Ce manifeste remplace celui du kit initial.

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

Restent la recette réelle en ligne de 0.1.1, le contrôle RLS complémentaire sur Supabase de développement, les codecs audio/vidéo représentatifs, l'accessibilité et la performance sur téléphone réel, ainsi que consentement et conservation avant partage de données réelles. Voir `docs/06-BACKLOG.md`.
