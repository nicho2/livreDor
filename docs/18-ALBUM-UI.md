# Album chaleureux — recette locale

L'identité et les composants de consultation sont décrits dans ADR-018.

Depuis 0.1.1, le choix local d'apparence est remplacé par un thème de projet
commun aux participants et choisi par l'organisateur (ADR-019).
Voir [gestion, thèmes et suppression](20-GESTION-THEMES-SUPPRESSION.md).

## Démarrage de la recette isolée

`npm run test:ui:fixture` démarre Next sur 3101, un proxy sur 3100 et des services
Auth/PostgREST fictifs sur 54329. Les ports doivent être disponibles. Le répertoire
`.next-ui` isole la compilation du serveur de développement habituel.

Ouvrir http://localhost:3100/auth?next=/p/album-test/guestbook et utiliser
`recette@example.test`, code fictif `123456`. Aucun email n'est envoyé. Les
30 souvenirs, cinq messages et médias synthétiques sont en mémoire ; un
redémarrage réinitialise la recette. Aucun Supabase/R2 réel n'est contacté.
L'écran de connexion indique explicitement la simulation et le code fictif,
y compris après « Recevoir mon code » : ne pas attendre un email sur cette recette.
La simulation média ne valide pas les signatures R2 ni la sécurité RLS réelle.

Garder le terminal de recette ouvert pendant l'essai. Le port `3101` affiché par
Next est interne : il contourne le proxy de connexion et de médias. Les accès
directs à ce port sont désormais redirigés temporairement vers `3100`, en
conservant le chemin et les paramètres. Cette redirection est limitée au mode
recette ; le serveur habituel sur `3000` garde ses routes normales.

Pour tester la compilation de production sous PowerShell :

```powershell
$env:LIVREDOR_UI_FIXTURE='1'
$env:NEXT_PUBLIC_SUPABASE_URL='http://localhost:3100'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY='fixture-only'
npm run build
node scripts/ui-fixture.mjs --production
```

Utiliser un terminal dédié : ces variables servent uniquement à la recette.
Arrêter la recette avec Ctrl+C avant de recompiler `.next-ui`.

## Tests Playwright persistants

`tests/album-browser.mjs` exporte des tests utilisant l'API Playwright du
Browser Codex. Après initialisation du Browser selon sa compétence, fournir
un onglet de recette `tab` et sa capacité `viewport` :

Utiliser un onglet de test nouvellement créé et sélectionné pour la série de
tests responsive : la capacité viewport agit sur l'onglet actif. Les assertions
contrôlent `innerWidth` pour ne pas certifier une taille qui n'a pas été appliquée.

```javascript
const suite = await import('file:///CHEMIN_ABSOLU/tests/album-browser.mjs');
await suite.loginFixture(tab);
for (const width of [1440, 900, 375]) {
  await suite.testBook(tab, viewport, width);
  await suite.testPageTurn(tab, viewport, width);
  await suite.testEditor(tab, viewport, width);
  await suite.testWall(tab, viewport, width);
  await suite.testTimeline(tab, viewport, width);
}
await suite.testThemeAndAccess(tab);
await viewport.reset();
```

Assertions : pages simples/doubles, navigation, aperçu et classes de formatage,
brouillon/publication, absence de débordement, lots de souvenirs, galerie et zoom,
audio, fermeture Échap et focus restitué, dispositions de la frise et exclusion
des souvenirs non datés. Compléter par captures visuelles, navigation clavier,
changement/persistance d'ambiance et accès anonyme.

Ces tests sont séparés de `npm test` (tests Node sans navigateur). Aucun secret
ni stockage de session n'est nécessaire dans les tests. Les migrations, API et
règles RLS existantes demeurent couvertes par les suites du socle.

### Volume et restitution

`node scripts/ui-fixture.mjs --production --large` fournit 300 souvenirs et
6000 métadonnées média (20 par souvenir), un message long et un plafond simulé
de 1000 résultats par requête. `suite.testLargeAlbum(tab, viewport, width)`
vérifie que les 300 cartes gardent leurs compteurs complets et restent sans
débordement. Le chargement utilise des groupes de 24 identifiants ; les photos
réservent leur hauteur pendant la récupération de l'URL signée.

`node --env-file=.env.local scripts/test-v1-integration.mjs --save-site`
conserve uniquement le site synthétique extrait du ZIP dans `.archive-tests/`,
ignoré par Git. Pour une compilation isolée, définir `LIVREDOR_UI_FIXTURE=1`
dans le terminal de ce test. Puis démarrer la prévisualisation en lui passant
le dossier `site` affiché :

```powershell
node scripts/preview-archive-test.mjs .archive-tests/IDENTIFIANT_DU_TEST/site
```

`suite.testStaticArchive(tab, viewport, width)` vérifie le site sur le port 3102 :
navigation, photo locale décodée, absence de scripts et de brouillons, largeur
mobile. Ce serveur écoute seulement la boucle locale et ne sert pas les JSON
privés. Les fichiers et comptes Supabase réels ne sont pas modifiés par ce test ;
les fichiers R2 portant les UUID du test sont nettoyés à sa fin.

## Limites volontaires

Le feuilletage utilise une feuille recto/verso en rotation 3D pendant 600 ms,
dans les deux sens, sur ordinateur et mobile. Les commandes restent bloquées
pendant ce mouvement et aux extrémités, avec un curseur neutre. La préférence
`prefers-reduced-motion` supprime la transition ; un délai de secours libère
les commandes si le navigateur annule l'animation. Les duplications visuelles
de la feuille sont cachées aux lecteurs d'écran.

Les deux ambiances actuelles (Album chaleureux et Classique) sont la première
collection ; les variantes par événement pourront enrichir les tokens existants.

Le thème est une préférence locale ; la personnalisation organisateur persistée
par projet est ultérieure. Pas de photos associées aux messages principaux,
ni d'éditeur libre. Les médias restent sur les souvenirs. L'export final conserve
le rendu statique existant. Le bouton plein écran ouvre le fichier signé dans un
onglet ; les codecs audio/vidéo dépendent du navigateur.
