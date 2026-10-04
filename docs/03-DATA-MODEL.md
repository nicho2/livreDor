# Modèle de données

## Relations principales

```text
auth.users
   |
   +-- profiles
   |
   +-- project_members -- projects
   |                       |
   |                       +-- guestbook_entries
   |                       |
   |                       +-- memories -- media_assets
   |
   +-- guestbook_entries
   +-- memories
```

## projects
Représente un livre d'or / événement.

Depuis 0006, les nouvelles créations passent par la RPC serveur
`create_project_limited` : le nombre total de lignes (tous états) est comparé au
plafond d'environnement sous verrou transactionnel global. Ni nouveau statut
ni table de quota ; pas de suppression quand le plafond est abaissé.

Principaux champs :
- `id uuid`
- `slug text unique`
- `title text`
- `subject_name text`
- `description text`
- `event_date date`
- `opens_at timestamptz`
- `closes_at timestamptz`
- `status text`
- `created_by uuid`

La migration 0008 ajoute `theme` (huit valeurs prédéfinies),
`content_revision`, `archive_exported_at` et `deletion_started_at`.
La révision invalide la preuve d'export après modification. Les RPC de preuve
et de suppression sont réservées au serveur ; les triggers protègent également
les écritures directes. Voir [la procédure](20-GESTION-THEMES-SUPPRESSION.md).

## project_members
Relie les comptes à un projet.

Rôles V1 :
- `organizer`
- `contributor`

## Invitations organisateur (migration 0005)

`project_organizer_invites` conserve une invitation par projet : `project_id`,
email normalisé privé, `invited_by`, `accepted_by` facultatif et `created_at`.
Lecture réservée aux organisateurs, écritures uniquement par RPC contrôlée.
Cette donnée technique est exclue des archives, même privées. Elle n'est pas un
contenu éditorial et n'introduit aucun nouveau statut de publication.

La migration 0009 ajoute la RPC serveur `create_project_with_organizer`, qui
réutilise le quota de création et enregistre une invitation privée dans la même
transaction. L'acceptation reste celle de 0005 et exige l'email OTP confirmé.

## profiles
Profil public minimal séparé de l'email Supabase.

## guestbook_entries
Message principal du livre d'or.

Un contributeur possède au maximum un message principal par projet. Il peut le
modifier et changer son statut entre `draft` et `published`. Les souvenirs
restent multiples et indépendants.

La personnalisation est stockée dans `formatting jsonb`, par exemple :

```json
{
  "font": "serif",
  "size": "md",
  "align": "left",
  "color": "ink",
  "bold": false,
  "italic": false
}
```

## memories
Souvenirs autonomes et multiples.

Le temps est représenté par :
- `occurred_on date` ;
- `year_from int` ;
- `year_to int`.

Une date exacte a priorité. Sinon la période est utilisée.

## media_assets
Métadonnées d'un blob R2.

Le champ `object_key` est la clé R2 et non une URL permanente.
