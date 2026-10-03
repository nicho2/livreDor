# Validation de développement — 3 octobre 2026

Projet testé : `depart-demo`, application locale sur `http://localhost:3000`,
base Supabase de développement distante. Aucun déploiement effectué.

## Vérifications réussies

- Connexion Supabase avec les clés locales ; les six tables métier sont accessibles.
- Authentification email activée et inscription autorisée.
- Première connexion OTP effectuée par l'utilisateur après configuration des
  modèles **Confirm sign up** et **Magic link or OTP** avec `{{ .Token }}`.
- Projet de démonstration créé et compte confirmé associé au rôle organisateur.
- Message principal et souvenir saisis par l'utilisateur : présents en base,
  tous deux `published`, accessibles au client anonyme.
- Trois souvenirs fictifs ajoutés via le client serveur de service, rattachés
  au compte organisateur et identifiés par le préfixe `TEST —`.
- Avant publication, les trois brouillons sont invisibles au client anonyme.
- Après publication, chaque souvenir est lisible par le client anonyme.
- Un souvenir modifié puis masqué reste conservé en base et devient invisible
  au client anonyme.
- Mur et chronologie : HTTP 200 ; les deux souvenirs fictifs publiés sont
  affichés et le souvenir masqué est absent.
- Chronologie : rendu de la date `12 juin 2015` et de la période `1998 – 2002`.

## Données fictives laissées dans le projet

- `TEST — Une journée mémorable` : publié, date exacte 2015-06-12.
- `TEST — Les premières années` : publié, période 1998–2002.
- `TEST — Brouillon puis masquage` : masqué, sans date.

Le message et le souvenir de l'utilisateur ont été conservés sans modification.
Le message principal étant unique par compte et projet, aucun second message
n'a été ajouté sous son compte.

## Limites et contrôles restant à réaliser

Les écritures des données fictives utilisent la clé de service : elles ne
valident pas les permissions d'écriture RLS d'un contributeur. Les contrôles
de visibilité utilisent la clé publique sans session et exercent la RLS de
lecture. Le compte de l'utilisateur étant organisateur, son parcours ne prouve
pas à lui seul les permissions d'un contributeur ordinaire.

Le contrôle du navigateur, initialement indisponible à cause d'une version
manquante dans le cache du plugin après mise à jour, a été réparé. La liste des
onglets, la lecture de la page de contribution et son actualisation sont
vérifiées. La session retrouve le message et les souvenirs après chargement.
Voir `11-BROWSER-TROUBLESHOOTING.md` pour la procédure reproductible.
Les clics brouillon/modification/masquage restent à vérifier dans l'interface.

Restent notamment : tests entre deux contributeurs et deux projets, tentatives
d'écriture anonymes, unicité du message principal, retour de session, fermeture
du projet, rendu de la personnalisation et ordre chronologique mixte
dates/périodes. R2 n'est pas configuré et les médias ne sont pas testés.
