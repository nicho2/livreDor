# Backlog V1 — état au 3 octobre 2026

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
- [x] Création, lecture, modification et masquage.
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
- [ ] Contrôle complémentaire RLS sur Supabase de développement.
- [ ] Recette de fichiers audio/vidéo représentatifs et de leurs codecs.
- [ ] Audit complet d'accessibilité et mesure de performance sur téléphone réel.
- [ ] Avant publication : hébergement, consentement, durée de conservation et validation des URL publiques du bucket.
