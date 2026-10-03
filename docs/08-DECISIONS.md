# Journal des décisions

## ADR-001 — Supabase pour auth + données structurées
**Décision :** Supabase Free au démarrage.

**Raison :** auth OTP, PostgreSQL, RLS, faible charge opérationnelle.

## ADR-002 — Cloudflare R2 pour les médias
**Décision :** les médias ne sont pas stockés dans Supabase Storage.

**Raison :** séparer les blobs lourds du backend métier et conserver une structure de coûts adaptée aux médias.

## ADR-003 — Multi-projets au niveau du modèle
**Décision :** toutes les données métier sont rattachées à `project_id`.

**Raison :** ne pas enfermer le code dans le seul cas d'un départ en retraite.

## ADR-004 — Contribution et souvenir sont deux objets différents
**Décision :** `guestbook_entries` et `memories` sont séparés.

**Raison :** une personne peut laisser un message unique et plusieurs souvenirs.

## ADR-005 — Auth OTP sans mot de passe
**Décision :** l'utilisateur saisit son email et reçoit un code/lien.

**Raison :** réduire la friction tout en disposant d'une identité technique.

## ADR-006 — Personnalisation bornée
**Décision :** style structuré, pas de HTML/CSS libre.

**Raison :** préserver la cohérence visuelle et éviter les risques XSS.

## ADR-007 — Projet temporaire, restitution durable
**Décision :** le produit doit savoir produire une archive autonome.

**Raison :** le site actif n'a pas vocation à rester en ligne éternellement.

## ADR-008 — Fenêtre de contribution et identité des contenus

**Décision :** les écritures des contributeurs exigent un projet ouvert, une
adhésion et une fenêtre temporelle active. L'organisateur conserve le droit de
modérer après clôture. L'identifiant, le projet et l'auteur d'un contenu ne sont
pas modifiables ; un média ne peut être réaffecté à un autre souvenir ou blob.
La lecture publique exige aussi un projet non brouillon. Un média attaché à un
souvenir non publié n'est pas exposé publiquement.

**Raison :** aligner la RLS avec les contrôles déjà effectués par `join_project`,
empêcher les déplacements inter-projets et préserver une modération immédiate.
La migration `0003_content_access_guards.sql` corrige les politiques initiales ;
elle doit être appliquée à Supabase pour rendre ces protections effectives.
