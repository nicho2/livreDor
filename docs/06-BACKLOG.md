# Backlog V1 — état au 6 octobre 2026

Évolution du 8 octobre : invitation partagée à code aléatoire, accès enregistré
dès la lecture, accueil « Mes projets », renouvellement et isolation RLS (0013,
ADR-026). Application sur Supabase et recette hébergée à effectuer avec la livraison.

Les cases cochées indiquent une fonctionnalité implémentée, pas une certification
de production. Les preuves et limites de validation sont dans
`10-LOCAL-VALIDATION.md` ; l'exploitation est décrite dans `13-V1-OPERATIONS.md`.

## Phase 0 — Mise en route
- [x] Créer Supabase.
- [x] Créer R2 privé et configurer le CORS local.
- [x] Renseigner `.env.local` (ignoré par Git).
- [x] Appliquer les migrations SQL du socle.
- [x] Créer un projet de démonstration.

## Phase 1 — Auth
- [x] OTP email complet — connexion réelle confirmée par l'utilisateur.
- [x] Retour au projet, restauration de session et en-tête synchronisé.
- [x] Nom affiché minimal, réutilisé par défaut sans exposer l'email.
- [x] Rejoindre un projet.

## Phase 2 — Livre d'or
- [x] Formulaire message.
- [x] Éditeur borné (pas de HTML/CSS libre).
- [x] Brouillon.
- [x] Publication.
- [x] Modification de sa contribution.

## Phase 3 — Souvenirs
- [x] Création, lecture, modification et suppression définitive par l'auteur ; masquage conservé dans Organisation (migration 0011).
- [x] Date exacte.
- [x] Année/période.
- [x] Plusieurs souvenirs par contributeur.

## Phase 4 — Médias
- [x] Pré-signature PUT contrôlée côté serveur.
- [x] Upload direct R2 puis finalisation vers un objet distinct.
- [x] Enregistrement et vérification des métadonnées.
- [x] URL GET temporaire signée selon les droits de lecture.
- [x] Suppression logique et physique.

## Phase 5 — Consultation
- [x] Livre d'or dédié aux messages publiés, distinct du mur des souvenirs.
- [x] Mur.
- [x] Vue détail.
- [x] Chronologie.
- [x] Responsive — formulaire et détail contrôlés à 375 px.

## Phase 6 — Administration
- [x] Liste des contenus.
- [x] Filtre par statut.
- [x] Publier/masquer.
- [x] Gestion média.
- [x] Clôture et fenêtres de contribution.
- [x] Paramètres du projet, création guidée et partage avec un deuxième organisateur (migrations 0004/0005 appliquées ; partage réel confirmé par l'utilisateur).

## Phase 7 — Export
- [x] Export JSON privé.
- [x] Copie des médias, sans dépendance aux URL signées.
- [x] Génération d'un site statique publiable séparément.
- [x] ZIP final après clôture.
- [x] README d'archive distinguant sauvegarde privée et restitution.

## Phase 8 — Qualité
- [x] Tests unitaires et suite RLS PostgreSQL isolée.
- [x] Tests d'intégration API avec R2 réel et données métier isolées.
- [x] Upload, publication, persistance et lecture d'une image dans le navigateur local.
- [x] Gestion des erreurs et contrôle des accès organisateur.
- [x] Recette organisateur du socle : filtres, modération, clôture, ZIP et réouverture confirmés par l'utilisateur.
- [x] Contrôle complémentaire RLS sur le Supabase configuré, en lecture seule ; migrations/RLS/quota vérifiés séparément sur PostgreSQL jetable.
- [ ] Recette de fichiers audio/vidéo représentatifs et de leurs codecs.
- [ ] Audit complet d'accessibilité et mesure de performance sur téléphone réel.
- [x] Hébergement Sites : release 0.1.2 publiée, sans migration nouvelle (voir `17-SITES-DEPLOYMENT.md`).
- [x] Recette souvenir 0.1.2 en ligne sur TEST : médias réels R2 synthétiques, brouillon, publication directe et focus mobile.
- [ ] Recette complémentaire en ligne : nouveau cycle OTP, deuxième compte, thème, clôture et ZIP autonome sur la version actuelle.
- [ ] Avant partage de données réelles : consentement et durée de conservation. Le bucket R2 reste privé ; toute diffusion du site statique exporté est une décision séparée.
- [x] Décision : trois mois maximum après l'événement pour l'hébergement, restitution conservée par le destinataire.
- [x] Revue RGPD et écarts documentés : voir document 23.
- [ ] Appliquer effectivement la suppression avant l'échéance ; comptes/sauvegardes et contrats fournisseurs à traiter séparément.
- [x] Contact email local : configuration Resend et migration 0010 installées ; message enregistré et notification acceptée le 5 octobre. Livraison en boîte non attestée.
- [x] Configuration Resend sur l'hébergement appliquée au déploiement du 6 octobre.
- [ ] Recette email en ligne et réception en boîte.

## Prochaine version après v0.1.0

- [x] Afficher discrètement le numéro de version de l'application sur les pages
  web, sur ordinateur et mobile (par exemple dans le pied de page), afin de
  pouvoir identifier la version consultée lors de la recette et du support.
  Utiliser une source unique cohérente avec la version publiée ; éviter une
  valeur copiée manuellement dans chaque page. Demande utilisateur du 3 octobre
  2026, réalisée pour 0.1.1.
- [x] Choix partagé du thème par l'organisateur et huit skins prédéfinis.
- [x] Création réservée aux gestionnaires du site, accessible depuis `/all`.
- [x] Zone de danger : suppression d'un projet archivé après export et nettoyage R2.

## Release 0.1.2 — publiée

- [x] Sélection de médias dès la création du souvenir, sauvegarde en brouillon pendant l'envoi et reprise après échec.
- [x] Publication d'un brouillon directement depuis sa carte.
- [x] Défilement et focus du formulaire rempli après « Modifier ».
- [x] Livraison et recette des trois corrections sur l'hébergement, à 375 px également.

## Release 0.1.3 — publiée

- [x] Étapes et contact, notice publique de confidentialité et liens depuis la connexion.
- [x] Contact privé avec notification Resend, quota, reprise idempotente et accusé de lecture.
- [x] Suppression définitive auteur avec nettoyage R2 et reprise après échec ; masquage conservé dans Organisation.
- [x] Correction : les médias finalisés ou déjà retirés ne retardent plus la suppression.
- [x] Migrations 0010–0012 appliquées au Supabase configuré et testées sur PostgreSQL jetable.
- [x] Clôture/restitution/suppression manuelle expliquées ; aucune purge automatique.
- [x] Espacement entre vignettes et bloc inférieur du projet, et entre sections de l'accueil.
- [x] Publication du code 0.1.3, release GitHub, deux CI réussies et version Sites 8 ; contrôles HTTP publics réussis.
- [ ] Recette des parcours authentifiés hébergés, reportée par l'utilisateur.
- [ ] Mentions propres au responsable et règles de diffusion à compléter avant collecte réelle.
