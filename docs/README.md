# Documentation LivreDor

Point d'entrée : [README du projet](../README.md). Les documents ci-dessous sont
versionnés avec le code, pas publiés sur le site applicatif.

## Installer, tester, exploiter

- [Release 0.1.2 et parcours de recette](21-RELEASE-0.1.2.md)
- [Version, thèmes et gestion du site (0.1.1)](20-GESTION-THEMES-SUPPRESSION.md)
- [Présentation de l'application en images, ordinateur et mobile](19-PRESENTATION-VISUELLE.md)
- [Interface Album chaleureux et recette locale](18-ALBUM-UI.md)
- [Installation, Supabase et Resend](15-INSTALLATION-RESEND.md)
- [Configuration R2 locale](12-R2-LOCAL-SETUP.md)
- [Création et organisation partagée](14-ONBOARDING-REGRESSION.md)
- [Jeu synthétique et commande PowerShell](16-SYNTHETIC-SEED.md)
- [Exploitation, export et limites de la V1](13-V1-OPERATIONS.md)
- [Preuves de validation et recette restante](10-LOCAL-VALIDATION.md)
- [Dépannage du navigateur](11-BROWSER-TROUBLESHOOTING.md)
- [Déploiement Sites et recette en ligne](17-SITES-DEPLOYMENT.md)

## Produit et architecture

- [Vision](00-VISION.md)
- [Spécification](01-PRODUCT-SPEC.md)
- [Architecture](02-ARCHITECTURE.md)
- [Données](03-DATA-MODEL.md)
- [Parcours](04-UX-FLOWS.md)
- [Sécurité et vie privée](05-SECURITY-PRIVACY.md)
- [Backlog](06-BACKLOG.md)
- [Archive finale](07-EXPORT-ARCHIVE.md)
- [Décisions](08-DECISIONS.md)
- [Consignes de reprise](09-CODEX-PROMPT.md)

## Disponibilité en ligne

Contrôle du 4 octobre 2026 : `git ls-remote origin` confirme que GitHub/main et
le dépôt local avant cet audit correspondent au commit `105b27a`, qui inclut
le compte rendu du déploiement 0.1.1. La documentation de ce commit est donc
disponible sur [GitHub](https://github.com/nicho2/livreDor/tree/main/docs).
Les corrections de documentation de cet audit restent locales jusqu'à leur push.
Le dépôt source Sites est distinct : un push GitHub ne déploie pas
automatiquement le site applicatif. Sites confirme la publication réussie de
la version 6 (application 0.1.1), issue du commit de release `ca426a9` ;
voir [le registre de déploiement](17-SITES-DEPLOYMENT.md).

Préparation de la livraison 0.1.2 : voir [la release](21-RELEASE-0.1.2.md) et [la préparation confidentialité](22-OUVERTURE-CONFIDENTIALITE.md). Les résultats actuels complètent l'audit historique ci-dessus.
