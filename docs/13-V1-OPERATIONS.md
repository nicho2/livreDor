# Exploiter la V1 en local

## Démarrer et vérifier

Prérequis pour 0.1.3 : Node 24, `.env.local` configuré, migrations 0001 à 0012 appliquées,
modèles OTP Supabase et bucket R2 privé/CORS configurés.

Le Supabase configuré a reçu 0010–0012 le 5 octobre 2026. Une nouvelle installation
doit appliquer les fichiers dans l'ordre ; ne pas relancer 0011 sur une base qui
possède déjà son champ. `0012` corrige la suppression avec un média finalisé ou
déjà retiré. Les migrations n'exécutent aucune suppression de contenu existant.
Le contact nécessite aussi `RESEND_API_KEY` et `LIVREDOR_CONTACT_FROM` côté serveur,
distincts de la configuration SMTP des codes OTP. L'environnement local ne configure
pas l'hébergement. Voir [la release préparée](24-RELEASE-0.1.3.md).

La création exige aussi la migration 0006. `LIVREDOR_MAX_PROJECTS=3` (par défaut)
limite à trois projets au total, tous états confondus. `0` suspend la création.
Modifier cette variable serveur puis redémarrer ; une valeur invalide fait
échouer la création explicitement. Fermer/archiver ne libère pas une place,
car les médias restent stockés. Les projets existants restent utilisables.

```powershell
npm ci
npm run dev
```

Ouvrir `http://localhost:3000`. Webpack est utilisé par défaut sur Windows.
Ne lancer qu'un serveur sur le port 3000. Arrêter le serveur avant un build.
Pour vérifier la version compilée : `npm run build`, puis `npm start`.
Après une modification du code en mode `start`, refaire le build.
Un verrouillage de `.next` n'autorise pas à supprimer les sources ou à désactiver
les protections Windows : arrêter le serveur, attendre la libération, relancer.
Pour le contrôle du navigateur Codex, voir `11-BROWSER-TROUBLESHOOTING.md`.

## Contribuer et consulter

- Connexion par email et code obligatoire aussi pour consulter ; retour automatique à la page demandée.
- Sans connexion, ni liste de projets ni messages/souvenirs/médias. Migration 0007 nécessaire aussi contre les lectures directes Supabase.
- « Mes contributions » affiche ses propres messages/souvenirs et brouillons.
- Le nom affiché reprend celui de la dernière contribution, sans écraser une saisie.
- Un message principal par compte et projet ; plusieurs souvenirs possibles.
- Sélectionner les médias dans le formulaire, puis enregistrer en brouillon ou publier. Un envoi échoué conserve le brouillon et permet de réessayer dans la page ; les fichiers non envoyés doivent être resélectionnés après rechargement.
- Un brouillon dispose d'un bouton « Publier » sur sa carte ; « Modifier » amène directement au formulaire.
- Photo 15 Mo, vidéo 200 Mo, audio 50 Mo, PDF 25 Mo ; 20 fichiers par souvenir.
- HTML et SVG refusés. HEIC/HEIF sont téléchargeables, sans aperçu garanti.
- « Voir tous les souvenirs » affiche les contenus publiés de tous les auteurs.
- Cliquer le titre d'un souvenir ouvre son détail avec ses médias.
- La chronologie trie dates exactes et périodes ensemble ; les non datés restent sur le mur.
- Si une URL média expire, utiliser « Actualiser les médias ».

Les erreurs réseau sont affichées, sans annoncer une réussite après échec.
Les formulaires sont désactivés quand la fenêtre est fermée ; RLS et les API
protègent également les écritures, même si une page ouverte devient obsolète.

## Organiser

Depuis `/all`, « Créer un LivreDor » permet au gestionnaire connecté et autorisé
par `LIVREDOR_SITE_MANAGERS` de créer son projet et d'en devenir organisateur.
Il peut désigner une autre personne par email dès la création (migration 0009).
Les informations et le thème du projet sont modifiables dans Organisation.
Voir `20-GESTION-THEMES-SUPPRESSION.md` ; le partage avec un deuxième compte
par email vérifié est décrit dans `14-ONBOARDING-REGRESSION.md`.

Le lien « Organisation » apparaît seulement pour un membre `organizer`.
Les API revérifient ce rôle sur chaque action ; cacher un lien ne suffit pas.
Le compte organisateur est le créateur, un compte initialement enregistré dans
`project_members`, ou la personne ayant accepté l'invitation privée correspondante.
Si le lien n'apparaît pas, se connecter avec ce compte ou l'adresse exactement
invitée : aucune autodéclaration de rôle organisateur n'est proposée.

- Filtrer brouillons/publiés/masqués, modifier leur visibilité.
- Un média ne s'affiche aux comptes connectés que si son souvenir est également publié, sauf droits auteur/organisateur.
- Masquer conserve le fichier ; supprimer le fichier est irréversible et demande
  une confirmation. Un masquage de souvenir cache aussi ses médias.
- Régler ouverture/clôture en UTC ; clôturer immédiatement via le bouton.
- Clôture = arrêt de la contribution, pas suppression du projet.
- La modération et l'export restent possibles après clôture.
- Réouvrir nécessite aussi des dates compatibles (effacer une ancienne clôture).

## Export final

Clôturer ou archiver avant d'utiliser « Télécharger l'archive ZIP ».
Décompresser intégralement, puis ouvrir `site/index.html`.

```
LivreDor-projet.zip
├── README.txt
├── site/                  # seul dossier éventuellement publiable
│   ├── index.html
│   ├── assets/app.css
│   └── media/             # fichiers publiés copiés, sans URLs temporaires
└── archive-privee/        # ne jamais publier
    ├── data/             # JSON complet, participants par nom/UUID, sans emails
    └── media/            # fichiers privés disponibles
```

Le site fonctionne sans Supabase/R2 ni JavaScript. Les données privées incluent
brouillons/masqués et identifiants techniques, mais jamais l'email d'authentification.
Le manifeste indique les uploads non finalisés ou fichiers déjà supprimés.
Un fichier publié absent bloque l'export : le réparer ou le masquer explicitement.
Ne pas publier le ZIP entier. Valider consentements, durée de conservation et
contenus avant toute diffusion. L'export ne réalise aucun déploiement.

## Tests reproductibles

```powershell
npm run lint
npm run typecheck
npm test
./scripts/test-rls-local.ps1
npm run build
npm run test:integration
```

Le dernier test utilise les API Next compilées, une fixture Auth/PostgREST
**uniquement locale** et le bucket R2 réellement configuré. Il n'utilise pas de
session navigateur, ne crée aucun compte Supabase et ne modifie aucun projet
utilisateur. Il écrit quelques octets sous des UUID aléatoires et nettoie
uniquement ses propres clés. Il vérifie PUT/CORS/finalisation/GET/suppression,
droits, clôture, archive ZIP et copie des fichiers. Le test RLS PostgreSQL reste
distinct : la fixture HTTP n'est pas une preuve de RLS Supabase.

La variable serveur facultative `SUPABASE_URL` permet d'isoler ce test sans
changer l'URL publique compilée. Ne pas la renseigner dans `.env.local` courant.
Les clés et `.env.local` ne doivent jamais être ajoutés à Git.

## Limites et vigilance

- Les URLs déjà délivrées restent utilisables jusqu'à 5 minutes après masquage.
- Les médias ne font pas l'objet d'une analyse antivirus.
- Rotation de clé R2 : migrer les preuves HMAC des objets avant de retirer
  l'ancienne clé, sinon la lecture de ces objets échouera par sécurité.
- Une coupure après PUT peut laisser un temporaire ; l'auteur peut supprimer
  l'envoi inachevé depuis ses contributions. Prévoir nettoyage périodique avant
  un usage à grande échelle, sans supprimer les fichiers utilisateur par glob.
- Le ZIP est généré en flux côté serveur, mais le navigateur le reçoit en blob :
  pour de très grosses archives, `scripts/export-project.mjs` permet le transfert
  direct sur disque via l'API locale et une session organisateur autorisée,
  sans écraser un fichier existant. Ne jamais fournir le jeton en argument CLI.
  Un téléchargement interrompu est conservé avec le suffixe `.partial`.
- Le seuil 20 médias protège l'usage normal ; ce n'est pas un quota atomique
  contre des requêtes concurrentes ni une protection complète contre les abus.
- Les brouillons de projet ne sont pas accessibles par les routes publiques.
- Révision RGPD/consentements et configuration d'hébergement requises avant
  publication. Aucun push ni déploiement sans demande explicite.
