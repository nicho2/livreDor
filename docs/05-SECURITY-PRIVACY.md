# Sécurité et vie privée

## Données personnelles
Le système traite au minimum :
- email de connexion ;
- nom affiché ;
- contributions ;
- médias potentiellement personnels.

## Principes
- minimisation ;
- finalité claire ;
- durée de conservation liée au projet ;
- suppression possible ;
- email non public ;
- pas de tracking marketing par défaut.

## RLS

Depuis 0.1.1, la création exige un email OTP confirmé figurant dans la liste
serveur `LIVREDOR_SITE_MANAGERS`. `/all` et `/nouveau` contrôlent cet accès ;
l'API le vérifie indépendamment. Masquer le bouton ne constitue pas une protection.
Ce droit global reste distinct du rôle organisateur propre à chaque projet.

La suppression complète exige un organisateur, un projet clôturé puis archivé,
une preuve d'export à jour et une double confirmation. Un verrou interdit les
modifications pendant le nettoyage R2 ; une erreur laisse une suppression
reprenable. Les comptes sont conservés. Voir
[les garanties détaillées](20-GESTION-THEMES-SUPPRESSION.md).
Le schéma fourni impose notamment :
- aucune lecture anonyme des projets, contributions, souvenirs ou métadonnées média (migration 0007) ;
- lecture des contenus `published` des projets non brouillons uniquement après connexion OTP LivreDor ;
- lecture privée des brouillons par leur auteur et les organisateurs ;
- modification par auteur ou organisateur selon le cas.

Les politiques doivent être testées avant production.

Une session OTP n'est pas une invitation nominative : les comptes authentifiés
peuvent consulter les projets non brouillons, même avant de contribuer. Les
brouillons/masqués restent réservés à leur auteur et aux organisateurs.
L'accueil public ne fournit pas l'annuaire des projets. Les données sont chargées
dans le navigateur sous session/RLS, jamais dans le HTML/RSC anonyme.
L'API de lecture média vérifie une session puis la RLS avant de signer une URL.
Les URLs déjà signées restent utilisables au maximum cinq minutes.
Le dossier statique exporté reste sans authentification ; sa diffusion exige
une décision distincte de l'organisateur.

## Upload R2
Le navigateur ne reçoit jamais les clés API R2.

Le serveur contrôle :
- utilisateur authentifié ;
- appartenance au projet ;
- type MIME ;
- taille ;
- nom de fichier normalisé.

## Téléchargement / lecture
Pour un bucket privé, utiliser une URL GET pré-signée à durée limitée. Ne pas transformer le bucket en public uniquement pour simplifier le développement.

## Modération
Prévoir un bouton de masquage immédiat. Le masquage doit conserver la donnée pour permettre une restauration par l'organisateur.

## Création et partage d'organisation

Le rôle initial est attribué atomiquement au créateur authentifié, seulement sur
un nouveau projet. Les ID/roles/creator ne sont pas acceptés comme paramètres
client. Une invitation requiert un organisateur ; l'acceptation compare l'email
confirmé en base avec l'adresse privée enregistrée. Deux organisateurs maximum,
sans auto-promotion par email déclaré ni accès aux invitations d'autres projets.
L'adresse d'invitation est exclue de la consultation publique et de l'archive.
Elle est conservée dans le projet pour identifier le partage des droits.
La migration 0006 limite globalement les créations selon l'environnement serveur
(`LIVREDOR_MAX_PROJECTS`, 3 par défaut), avec comptage/verrou transactionnel en
base et RPC exclusivement serveur. Ni créateur ni limite ne viennent du client.
Ce plafond ne remplace pas un quota d'octets ou une protection anti-abus complète.
