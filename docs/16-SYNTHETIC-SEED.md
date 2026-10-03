# Jeu de test synthétique — alimentation d'un projet existant

Outil d'opérateur exécuté **localement**, jamais une fonctionnalité publique.
Il ne crée pas de projet et ne s'exécute pas automatiquement après déploiement.
Pas de commentaires de réseau social : les « commentaires » sont les messages
principaux du livre d'or, distincts des souvenirs.

## Contenu fourni

- 4 contributeurs fictifs distincts (Alice, Bruno, Camille, Dominique).
- 4 messages principaux : 3 publiés, 1 brouillon ; styles et emojis variés.
- 8 souvenirs : 5 publiés, 2 brouillons, 1 masqué.
- Dates exactes, année seule, période et absence de date.
- 5 pièces jointes : 2 illustrations générées, MP4 animé de 6 secondes,
  WAV synthétique de 3 secondes et copie d'image dans un souvenir privé.

Les fichiers sont dans `fixtures/seed-v1/`. Images marquées TEST, textes
explicitement synthétiques, aucune personne ni adresse réelle. Voir
[provenance et prompts](../fixtures/seed-v1/assets/PROVENANCE.md).
Ils sont embarqués et n'exigent ni FFmpeg ni service de génération à l'exécution.

## Préparer le projet en ligne

1. Déployer la V1 avec migrations 0001–0005 et R2 privé configuré. Le déploiement
   reste à réaliser ; ce document ne suppose aucune URL déjà publiée.
2. Dans l'accueil, créer **un projet de recette dédié**, titre `TEST — Recette`,
   lien `test-recette`, ouvert aux contributions.
3. Ne déposer aucun message/souvenir manuellement dans ce projet avant le script.
   Le script refuse les contenus qui ne font pas partie de son jeu. Les vrais
   projets, dont `depart-demo`, ne sont pas des cibles autorisées.
4. Sur le poste local, préparer `.env.seed.local` (ignoré par Git) avec les trois
   variables Supabase ci-dessous, pour **le même backend que le site de recette** :

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=VOTRE_CLE_PUBLIQUE_ANON
SUPABASE_SERVICE_ROLE_KEY=VOTRE_CLE_SERVEUR
```

Compléter dans un éditeur local, jamais dans une commande, un chat ou un commit.
Node.js 24 et `npm ci` suffisent. Les clés R2 restent sur le serveur applicatif ;
le script n'en a pas besoin. Le serveur de recette et le script doivent utiliser
le même Supabase, vérifié par l'ID et le lien du projet lors du contrôle organisateur.

## Commande PowerShell

Depuis la racine du dépôt, remplacer l'origine exemple par l'URL réelle choisie.
Premier passage : **aperçu hors ligne**, aucun réseau, email ou écriture :

```powershell
./scripts/seed-project.ps1 -BaseUrl 'https://VOTRE-SITE' -ProjectSlug 'test-recette'
```

Puis, uniquement quand la cible est prête :

```powershell
./scripts/seed-project.ps1 -BaseUrl 'https://VOTRE-SITE' -ProjectSlug 'test-recette' -EnvFile '.env.seed.local' -Apply
```

Le script demande de recopier `test-recette`, puis votre email organisateur et
son code OTP. **Un email réel vous est envoyé** via Supabase/Resend. Votre compte
doit déjà exister et organiser ce projet. La session du navigateur n'est pas
extraite, modifiée ou déconnectée. Aucun token n'est enregistré ni passé en argument.

Pour localhost, utiliser `-BaseUrl 'http://localhost:3000'` et le fichier
`.env.local` (valeur par défaut), toujours sur un projet de test dédié.
Ne pas contourner les politiques d'exécution PowerShell ou la vérification TLS.

## Fonctionnement et sécurité

L'API d'administration vérifie votre rôle avant la création des comptes fictifs.
La clé service sert uniquement aux opérations Auth locales de préparation :
retrouver les quatre identités déterministes et générer leurs sessions sans
envoi d'email. Les adresses réservées `@seed.example.invalid` ne sont pas des
destinataires réels. Aucun mot de passe ni rôle organisateur n'est attribué.

Chaque faux contributeur rejoint le projet et écrit avec **sa propre session**,
sous RLS. Les fichiers passent par les mêmes API que le navigateur : réservation,
PUT signé R2, finalisation. Ce n'est pas une insertion privilégiée de métadonnées
média : les fichiers sont effectivement transmis et contrôlés par le serveur.
Cette préparation ne valide pas la délivrabilité des OTP des faux comptes.

URL HTTPS obligatoire en ligne, redirections refusées, titre TEST et lien test-,
projet dédié et fenêtre ouverte. Les lignes ont des ID déterministes ; une
relance conserve les textes et statuts déjà modifiés, sans duplication. Un média
masqué/supprimé intentionnellement n'est pas rétabli automatiquement.

## Interruption et limites

Relancer la même commande, le même slug et le même fichier d'environnement.
Le journal `.seed-runs/UUID.json` (ignoré par Git, sans secret) distingue les
réservations média inachevées remplacées des masquages volontaires. Le conserver.
Seules les réservations inachevées de ces auteurs et souvenirs fictifs peuvent
être supprimées via l'API pendant la reprise ; aucun contenu réel n'est nettoyé.

Un verrou `.seed-runs/UUID.lock` bloque deux exécutions locales simultanées. Après
arrêt brutal, vérifier que le processus de seed est terminé, puis supprimer
**ce fichier de verrou exact**, pas le dossier ni le journal. Deux machines ne
partagent pas ce verrou : ne pas alimenter simultanément depuis deux postes.

Une session OTP expirée, un refus HTTP ou un upload interrompu produit un échec,
pas un faux message de réussite. Les données déjà créées restent pour la reprise.
Si le journal est illisible, le conserver et diagnostiquer avant toute relance.

Après essais : masquer les données depuis Organisation si nécessaire ; cela
ne supprime pas les fichiers R2. Pas de purge globale ni de suppression de compte
automatique. Pour retirer définitivement le projet dédié, prévoir une opération
séparée explicitement autorisée et ciblée (base, comptes fictifs, objets R2).

## Recette après alimentation

Vérifier 3 messages et 5 souvenirs publics ; Organisation doit montrer 4 messages
et 8 souvenirs avec les trois statuts. Tester les images, la vidéo et l'audio,
puis la chronologie. Le média du brouillon doit rester inaccessible publiquement.
Clôturer ce projet TEST, exporter le ZIP et ouvrir `site/index.html` : médias
autonomes, aucun email, brouillons/masqués uniquement dans la sauvegarde privée.
Le site public ne doit pas inclure les deux souvenirs en brouillon ni le masqué.

Tests automatisés : `npm test` couvre le plan, les garde-fous, les vrais fichiers,
les échanges SDK/API simulés, la reprise et l'absence de doublons. Aucun compte
ni fichier R2 réel n'est créé par ces nouveaux tests. L'alimentation réelle d'un
site en ligne reste à recetter quand son URL existe.
