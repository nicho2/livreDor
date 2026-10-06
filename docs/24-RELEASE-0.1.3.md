# Release 0.1.3 — préparation du 6 octobre 2026

Code préparé localement, non déployé. La dernière version publique documentée est
0.1.2. Un commit Git local ne publie ni GitHub ni le site Sites.

## Comportement livré dans le code

- Le contributeur comprend la collecte, la clôture, la remise du souvenir final
  et la suppression manuelle des données hébergées avant trois mois après l'événement.
  Le destinataire garde la restitution. Aucune purge automatique n'est prévue.
- Étapes et contact propose une demande privée à l'organisateur, enregistrée dans
  Supabase et notifiée par Resend, sans exposer les adresses organisateur. Les
  demandes sont exclues des exports, protégées par RLS et limitées à cinq par 24 h.
  La reprise utilise une clé idempotente ; l'accusé de lecture ne vaut pas traitement.
- Mes contributions affiche aussi les souvenirs masqués de leur auteur. Supprimer
  efface les fichiers R2 finaux/temporaires puis le souvenir et ses métadonnées.
  Organisation conserve le masquage. Un échec garde les références pour réessayer.
  Seuls les uploads récents non terminés imposent une attente ; les images envoyées
  ou déjà retirées ne bloquent plus. La confirmation explique les copies sur appareils.
- Espacement de 24 px sous les vignettes du projet et entre les sections de l'accueil.
- Notice publique de confidentialité accessible depuis le pied de page et la connexion.

## État des environnements

| Élément | État |
| --- | --- |
| Supabase configuré | Migrations 0010 contact, 0011 suppression et 0012 correction installées. Aucun contenu utilisateur effacé par les migrations. |
| Resend local | Clé et expéditeur configurés par l'utilisateur. Test réel le 5 octobre : demande enregistrée, notification acceptée ; réception en boîte non attestée. |
| Resend hébergé | Configuration à réaliser par l'utilisateur. Ne pas copier un fichier `.env.local` dans le dépôt. |
| Application publique | 0.1.2 ; publication 0.1.3 et recette hébergée restent à faire. |
| Documentation | Synchronisée avec le code préparé. Disponible localement ; publication GitHub séparée. |

## Contrôles et limites

Lint, TypeScript, 52 tests unitaires, builds Next.js/Sites, tests SQL isolés et
125 contrôles d'intégration par runtime ont passé pendant le développement.
La suite contrôle les fichiers R2 réels sur des UUID synthétiques, sans modifier
les comptes ou souvenirs réels. Le scanner client contrôle les secrets serveur.
Le registre [de validation](10-LOCAL-VALIDATION.md) conserve les preuves datées,
y compris la correction 0012 et les limites de recette navigateur.
Les captures des recettes sur les contributions réelles restent locales et sont
ignorées par Git ; elles ne font pas partie de la documentation publiée.

Le contrôle final du 6 octobre passe : 52 tests unitaires, 125 contrôles par
runtime, suite SQL complète et audit Supabase en lecture seule. Le scanner des
fichiers indexés Git vérifie les identifiants serveur avant commit. Les serveurs
de test sont temporaires et leurs ports sont vérifiés
après arrêt. Le serveur utilisateur sur 3000 reste sous son contrôle.

## Après la préparation Git

1. L'utilisateur configure `RESEND_API_KEY` et `LIVREDOR_CONTACT_FROM` sur l'hébergement.
2. Publier le code et la documentation selon le circuit de livraison, puis Sites.
3. Tester en ligne OTP, demande privée et réception email, suppression avec image,
   masquage organisateur, clôture et ZIP autonome. La recette personnelle utilisateur
   reste reportée à sa demande.
4. Avant collecte réelle, compléter responsable/finalité, base légale, destinataires
   et diffusion. Les contrats/régions, comptes/sauvegardes et traitement des droits
   sur les copies remises restent des points ouverts de la [revue RGPD](23-RGPD-ET-PARCOURS-CONTRIBUTEUR.md).

Cette préparation ne constitue pas une certification RGPD et n'ajoute aucun
formulaire extérieur ni tâche de suppression automatique.
