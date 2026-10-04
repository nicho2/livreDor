# Release 0.1.2 — contribution souvenir simplifiée

## Changements

- Sélection de photos, vidéos, audio et PDF dès le formulaire de création.
- Enregistrement automatique en brouillon pendant l'envoi ; publication après
  finalisation de tous les fichiers sélectionnés.
- En cas d'échec, texte et médias déjà envoyés conservés ; reprise sans nouveau
  souvenir. Les fichiers non envoyés restent sélectionnés dans la page et doivent
  être resélectionnés après rechargement.
- Publication directe d'un brouillon depuis sa carte.
- « Modifier » remplit le formulaire et défile vers son titre, avec focus clavier
  et respect de la réduction des animations.
- Nettoyage des serveurs de recette et de leurs processus enfants sous Windows.
- Mise à jour de la documentation de reprise, du manifeste et des procédures.

## Mise à niveau

Aucune nouvelle migration SQL ni variable de production. Les migrations 0001 à
0009 restent nécessaires. Supabase OTP/RLS et le bucket privé R2 restent les
sources de données existantes. La version du pied de page vient de `package.json`.

## Validation

Les résultats définitifs de la livraison sont consignés dans
[le registre de validation](10-LOCAL-VALIDATION.md) et
[le registre de déploiement](17-SITES-DEPLOYMENT.md).

## Recette sur l'hébergement

1. Ouvrir un projet TEST sous session OTP et vérifier le pied de page 0.1.2.
2. Dans Mes contributions, saisir une anecdote et sélectionner une petite photo
   avant le premier enregistrement ; enregistrer en brouillon.
3. Vérifier la photo et publier depuis la carte, sans passer par Modifier.
4. Cliquer Modifier : le formulaire rempli doit devenir visible avec le focus
   sur « Modifier le souvenir », aussi sur un écran étroit.
5. Ajouter des fichiers audio/vidéo représentatifs et vérifier leur lecture.
6. Avec un autre compte, vérifier publication visible et brouillons invisibles.
7. Pour un projet TEST autorisé, clôturer, exporter, ouvrir `site/index.html`, puis
   rouvrir si nécessaire. Ne pas supprimer un projet réel pour cette recette.

## Contrôles restant propres à l'exploitation

La recette simulée ne remplace pas un téléphone réel, ses codecs, le réseau
mobile ni les technologies d'assistance. La durée de conservation, le contact
de l'organisateur et les conditions de diffusion du site statique doivent être
arrêtés avant collecte de souvenirs réels. L'application ne réalise pas de purge
automatique à une date de conservation.
