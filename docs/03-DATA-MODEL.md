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

## project_members
Relie les comptes à un projet.

Rôles V1 :
- `organizer`
- `contributor`

## profiles
Profil public minimal séparé de l'email Supabase.

## guestbook_entries
Message principal du livre d'or.

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
