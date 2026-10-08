# Dépannage du contrôle du navigateur Codex

## Récidive résolue le 8 octobre 2026

Le runtime attendait `26.930.41038`, absent du cache après la mise à jour.
Le plugin officiel correspondant était fourni par l'installation Windows
`OpenAI.Codex_26.930.4958.0_x64__2p2nqsd0c76g0`. Les 384 fichiers ont été
restaurés dans le cache attendu et vérifiés par SHA256, sans modifier la
configuration ni supprimer les anciennes versions. Après réinitialisation du
runtime JavaScript, le navigateur intégré fonctionne sans redémarrer Codex.

La recette mobile des invitations passe dans ce navigateur. La confirmation
native du renouvellement a fait expirer une commande de clic ; la lecture
accessible puis le DOM ont confirmé sa réussite et le changement du code.

Incident résolu le 3 octobre 2026, après une mise à jour de Codex sous Windows.
Ce dépannage concerne l'outil de test de Codex, pas le code de LivreDor.

## Symptôme et cause constatés

L'initialisation du navigateur échouait avec `Cannot find module` pour :

```text
C:\Users\nicol\.codex\plugins\cache\openai-bundled\browser\26.930.31730\scripts\browser-service.mjs
```

La configuration du runtime demandait la version `26.930.31730`, mais le cache
ne contenait que les versions `26.917.71314` et `26.924.22138`. Le paquet complet
de la bonne version était présent dans l'application Windows installée.

## Procédure si le problème revient

1. Lire le `SKILL.md` du contrôle du navigateur disponible et conserver l'erreur
   exacte d'initialisation. Ne pas confondre cet échec avec un serveur local arrêté.
2. Examiner uniquement les lignes concernant `BROWSER_USE_CODEX_APP_VERSION`
   et `NODE_REPL_TRUSTED_SERVICES` dans le fichier local de configuration Codex.
   Vérifier le chemin de `browser-service.mjs` annoncé par l'erreur et les versions
   présentes dans `plugins/cache/openai-bundled/browser`. Ne pas afficher tout le
   fichier de configuration, les variables d'environnement ou les secrets.
3. Retrouver le plugin fourni par l'installation officielle de Codex. Lors de
   cet incident, sa source était :

   ```text
   C:\Program Files\WindowsApps\OpenAI.Codex_26.930.3930.0_x64__2p2nqsd0c76g0\app\resources\plugins\openai-bundled\plugins\browser
   ```

   Le chemin change avec les mises à jour. Vérifier la version dans
   `.codex-plugin/plugin.json` : elle doit correspondre exactement à celle
   attendue par le runtime. La version de l'application n'est pas celle du plugin.
4. Restaurer seulement cette version manquante dans le cache Codex, depuis ce
   paquet officiel. Cette écriture hors du dépôt nécessite l'autorisation de
   l'environnement. Ne supprimer aucune ancienne version, ne modifier ni les
   chemins de confiance ni la configuration pour pointer vers une version ancienne.
5. Vérifier les empreintes SHA-256 des fichiers source et destination. En cas
   d'échec ou de divergence, arrêter et diagnostiquer ; ne pas utiliser le module.
6. Si l'initialisation précédente a échoué, réinitialiser le runtime Node REPL,
   puis suivre le bootstrap du `SKILL.md` de la version restaurée. Si le runtime
   fonctionne déjà, suivre les consignes du skill avant toute réinitialisation.
7. Lister les onglets, sélectionner l'onglet existant sur `localhost:3000`, puis
   lire son arbre d'accessibilité. Vérifier que la page répond et que la session
   utilisateur reste disponible. Ne pas lire les cookies ou jetons de session.

## Particularité Windows Store : copie chiffrée

Une première tentative avec `Copy-Item -Recurse` a échoué : « Le fichier spécifié
n'a pas pu être chiffré ». Des dossiers avaient été créés, sans copie complète.
La réparation réussie a copié les octets par flux .NET, sans écraser de fichier
existant, puis comparé les SHA-256. Voici le principe à appliquer **uniquement
après avoir vérifié les chemins et la version**, en adaptant les deux chemins :

```powershell
$browserSource = 'CHEMIN_OFFICIEL_DU_PLUGIN_BROWSER'
$browserTarget = 'CHEMIN_CACHE_BROWSER_VERSION_ATTENDUE'
$browserSource = (Resolve-Path -LiteralPath $browserSource).Path
$browserTarget = [IO.Path]::GetFullPath($browserTarget)
$browserFiles = Get-ChildItem -LiteralPath $browserSource -File -Recurse -Force
foreach ($browserFile in $browserFiles) {
    $browserRelative = [IO.Path]::GetRelativePath($browserSource, $browserFile.FullName)
    $browserDestination = [IO.Path]::GetFullPath((Join-Path $browserTarget $browserRelative))
    if (-not $browserDestination.StartsWith($browserTarget + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Destination hors du cache cible'
    }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($browserDestination)) | Out-Null
    if (-not (Test-Path -LiteralPath $browserDestination)) {
        $browserInput = [IO.File]::OpenRead($browserFile.FullName)
        try {
            $browserOutput = [IO.File]::Open($browserDestination, [IO.FileMode]::CreateNew)
            try { $browserInput.CopyTo($browserOutput) }
            finally { $browserOutput.Dispose() }
        } finally { $browserInput.Dispose() }
    }
    $browserSourceHash = (Get-FileHash -LiteralPath $browserFile.FullName -Algorithm SHA256).Hash
    $browserTargetHash = (Get-FileHash -LiteralPath $browserDestination -Algorithm SHA256).Hash
    if ($browserSourceHash -ne $browserTargetHash) { throw "Copie différente : $browserRelative" }
}
```

Ne pas exécuter ce bloc avec les chemins fictifs. Si le paquet officiel est
introuvable ou incompatible, ne pas télécharger un module tiers ni contourner
les protections : vérifier l'installation de Codex et envisager son redémarrage.

## Résultat vérifié

384 fichiers restaurés et vérifiés. L'initialisation, la liste des onglets,
la lecture de la page de contribution et son actualisation fonctionnent.
La session retrouve le message et les souvenirs après chargement. Aucun
redémarrage de Codex ni changement de configuration n'a été nécessaire.
Cette vérification ne remplace pas les tests fonctionnels des formulaires.

## Incident distinct : serveur de développement verrouillé

Lors du développement de la V1, le serveur a retourné 500 et Turbopack a signalé
`os error 32` sur un `.next/dev/static/chunks/*.js.map`. Ce n'était pas une
absence du plugin navigateur. Après arrêt du serveur, le build Webpack puis
`next start` ont servi les pages normalement. Le navigateur a ensuite répondu
dans un nouvel onglet ; un onglet de l'ancienne page d'erreur pouvait conserver
une commande d'inspection bloquée. Les scripts `dev`/`build` utilisent maintenant
Webpack, avec `dev:turbo` disponible explicitement.

Vérifier HTTP et journal du serveur avant de réparer le plugin. Ne pas lancer
build/typegen en parallèle d'un serveur qui écrit dans `.next`. Réutiliser un
onglet sain ou créer un onglet neuf si celui d'une page d'erreur est bloqué,
sans lire ni copier les jetons de session et sans fermer un onglet utilisateur.
