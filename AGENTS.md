# AGENTS.md — LivreDor

## Mission
Construire **LivreDor**, une application web temporaire de collecte et de restitution de souvenirs autour d'une personne ou d'un événement. La V1 cible en priorité un départ en retraite mais le modèle doit rester multi-projets et générique.

## Intention produit
LivreDor n'est pas un simple livre d'or. Le produit doit permettre à un groupe de construire collectivement un souvenir numérique comprenant :
- un livre d'or personnalisable mais visuellement maîtrisé ;
- des souvenirs datés ou situés dans une période ;
- des médias (photo, vidéo, audio, documents) ;
- un mur des souvenirs ;
- une chronologie ;
- une restitution finale pérenne sous forme de site statique + archive complète.

## Principe directeur
Toute fonctionnalité doit au moins remplir un des deux critères suivants :
1. faciliter la contribution ;
2. enrichir la restitution finale.

Si elle ne remplit aucun de ces critères, elle n'appartient probablement pas à la V1.

## Décisions d'architecture actées
- Frontend : Next.js + TypeScript + React.
- Authentification : Supabase Auth par OTP email / magic code, sans mot de passe.
- Données structurées : PostgreSQL Supabase.
- Sécurité des données : Row Level Security (RLS) Supabase.
- Médias : Cloudflare R2, pas Supabase Storage.
- Upload média : URL pré-signée R2 générée côté serveur après vérification de session Supabase.
- Métadonnées média : stockées dans Supabase.
- Le modèle métier est multi-projets dès la V1, même si une seule instance/projet est utilisée au départ.
- Les emails sont des données techniques et ne doivent jamais être affichés publiquement.

## Priorités V1
1. Accès par email OTP.
2. Consultation d'un projet via slug.
3. Contribution au livre d'or.
4. Ajout de souvenirs distincts de la contribution principale.
5. Ajout de médias avec limites de taille.
6. Date/période associée aux souvenirs.
7. Mur des souvenirs.
8. Chronologie.
9. Interface organisateur minimale : publié / brouillon / masqué.
10. Export final des données et préparation du site statique.

## Hors périmètre V1
- IA générative dans l'expérience utilisateur.
- Reconnaissance faciale/personnes.
- Montage vidéo automatique.
- Réseau social, likes, commentaires, messagerie.
- Application mobile native.
- Géolocalisation avancée.
- Gestion complexe de rôles.
- Éditeur HTML libre.

## Modèle métier à respecter
Entités principales :
- `projects`
- `project_members`
- `profiles`
- `guestbook_entries`
- `memories`
- `media_assets`

Une `guestbook_entry` est un message principal de livre d'or. Un `memory` est un souvenir distinct, potentiellement multiple pour une même personne. Ne pas fusionner ces deux concepts.

## États de publication
Utiliser uniquement :
- `draft`
- `published`
- `hidden`

Éviter d'introduire de nouveaux statuts sans nécessité démontrée.

## UX
- Une contribution utile doit pouvoir être déposée en moins d'une minute.
- Les champs secondaires sont optionnels.
- La personnalisation du texte est bornée : police prédéfinie, taille prédéfinie, gras/italique, alignement, palette limitée, emojis.
- Ne jamais proposer de HTML arbitraire ou de CSS utilisateur.
- Mobile-first.
- Le parcours principal doit rester compréhensible sans tutoriel.

## Sécurité
- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` au navigateur.
- Toutes les opérations administrateur doivent être contrôlées côté serveur ou par RLS.
- Vérifier type MIME, taille déclarée et extension avant génération d'une URL pré-signée.
- Le bucket R2 doit être privé par défaut.
- Les URLs de lecture publiques ne sont à utiliser que si le projet choisit explicitement une publication publique. Pour la V1, préférer des URLs temporaires signées pour les médias privés.
- Ne jamais faire confiance à un `project_id` envoyé par le client sans vérifier l'appartenance de l'utilisateur au projet.

## RGPD / vie privée
- Collecter le minimum nécessaire.
- L'email sert à l'authentification et à la traçabilité ; ne pas l'afficher.
- Prévoir suppression/masquage des contributions.
- Prévoir une durée de vie du projet et une phase d'archivage.
- Aucune purge automatique ni suppression planifiée : la suppression des données hébergées du projet reste manuelle, après vérification de la restitution, au plus tard trois mois après l'événement. Le destinataire conserve la restitution remise.
- Ne pas ajouter de tracking marketing dans la V1.

## Convention de code
- TypeScript strict.
- Composants React fonctionnels.
- Validation des entrées avec Zod.
- Éviter les dépendances inutiles.
- Fonctions courtes et lisibles.
- Les règles métier doivent être documentées près du code concerné.
- Pas de secrets dans Git.
- Toute migration de schéma passe par `supabase/migrations/`.

## Definition of Done
Une tâche n'est terminée que si :
- le parcours utilisateur associé fonctionne ;
- les erreurs sont gérées ;
- les règles RLS sont compatibles ;
- la documentation est mise à jour si une décision structurelle change ;
- aucun secret n'est commité ;
- le code passe `npm run lint` et `npm run typecheck`.

## Documents de référence
Lire avant modification structurante :
- `README.md`
- `docs/01-PRODUCT-SPEC.md`
- `docs/02-ARCHITECTURE.md`
- `docs/03-DATA-MODEL.md`
- `docs/04-UX-FLOWS.md`
- `docs/05-SECURITY-PRIVACY.md`
- `docs/06-BACKLOG.md`
- `docs/07-EXPORT-ARCHIVE.md`
- `docs/08-DECISIONS.md`

## Règle pour les agents
Les serveurs lancés pour une recette ou un test sont temporaires. Relever les
processus et ports utilisés, arrêter le serveur et ses processus enfants en fin
de test, puis vérifier que les ports sont libérés, même après un échec. Ne laisser
un serveur ouvert que sur demande explicite de l'utilisateur. Ne jamais arrêter
un processus tiers simplement parce qu'il utilise un port habituel.

Les serveurs lancés pour une recette ou un test sont temporaires. Relever les
processus et ports utilisés, arrêter le serveur et ses processus enfants en fin
de test, puis vérifier que les ports sont libérés, même après un échec. Ne laisser
un serveur ouvert que sur demande explicite de l'utilisateur. Ne jamais arrêter
un processus tiers simplement parce qu'il utilise un port habituel.

Avant toute modification importante :
1. identifier la décision existante dans la documentation ;
2. éviter de la remplacer implicitement ;
3. si une décision doit changer, modifier `docs/08-DECISIONS.md` avec justification ;
4. préserver le périmètre V1.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
