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
