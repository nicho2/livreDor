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
Le schéma fourni impose notamment :
- lecture publique des contenus uniquement si le projet est publiable et le contenu `published` ;
- lecture privée des brouillons par leur auteur et les organisateurs ;
- modification par auteur ou organisateur selon le cas.

Les politiques doivent être testées avant production.

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
