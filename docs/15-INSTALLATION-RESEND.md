# Installation — Supabase OTP avec Resend

Procédure vérifiée dans les documentations officielles le 3 octobre 2026.
Resend transporte les emails ; Supabase génère et valide les codes. Aucun SDK
Resend, hook ou endpoint email supplémentaire n'est nécessaire dans LivreDor.
La configuration SMTP existante n'a pas été modifiée pendant cette rédaction.

## 1. Application et base

Node.js 24 et npm ; dans le dossier du projet, depuis PowerShell :

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm ci
```

Créer le projet Supabase, puis compléter `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL` : URL du projet.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` : clé publique anon utilisée par cette V1.
- `SUPABASE_SERVICE_ROLE_KEY` : clé serveur pour les API, jamais `NEXT_PUBLIC_*`.
- Variables R2 : suivre [la procédure dédiée](12-R2-LOCAL-SETUP.md).

Sur une **nouvelle base seulement**, appliquer les fichiers entiers dans l'ordre :
0001, 0002, 0003, 0004 et 0005 depuis `supabase/migrations/`. Sur la base actuelle,
ils sont déjà appliqués : ne pas rejouer trigger/table. Voir
[activation et TLS](14-ONBOARDING-REGRESSION.md).

## 2. Domaine et clé Resend

1. Dans Resend → Domains, ajouter un domaine possédé ou un sous-domaine dédié,
   par exemple `auth.example.com` (exemple à remplacer).
2. Chez le fournisseur DNS, recopier exactement les enregistrements demandés
   par Resend, puis lancer sa vérification. Ne pas remplacer les MX de réception
   de votre messagerie par ceux d'un sous-domaine d'envoi.
3. Attendre le statut de domaine vérifié avant d'utiliser un expéditeur tel que
   `connexion@auth.example.com`. Ne pas utiliser une adresse Gmail comme domaine
   d'expéditeur ; les destinataires, eux, peuvent utiliser Gmail ou d'autres services.
4. Désactiver le suivi des ouvertures et clics pour les emails d'authentification.
5. Dans API Keys, créer une clé dédiée aux envois Supabase, avec droits d'envoi
   et restriction au domaine approprié. Conserver sa valeur dans un gestionnaire
   de secrets et dans le mot de passe SMTP Supabase, pas dans ce dépôt.

Références : [domaines Resend](https://resend.com/docs/dashboard/domains/introduction),
[clés Resend](https://resend.com/docs/dashboard/api-keys/introduction).

## 3. SMTP Supabase

Supabase → Authentication → Email / Emails (section Notifications selon l'UI)
→ SMTP Settings → activer Custom SMTP, puis renseigner :

| Champ | Valeur |
| --- | --- |
| Sender email | Adresse du domaine vérifié, par exemple `connexion@auth.example.com` |
| Sender name | `LivreDor` |
| Host | `smtp.resend.com` |
| Port | `465` (TLS) |
| Username | `resend` |
| Password | La clé API Resend dédiée |

Enregistrer. La clé ne va **pas** dans `.env.local` de LivreDor pour ce scénario :
c'est Supabase qui dialogue avec Resend. Ne pas confondre la clé Resend avec la
clé Supabase, le mot de passe PostgreSQL ou les identifiants R2.

Référence : [Resend avec Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp).

## 4. Deux modèles contenant le code

Dans Authentication → Emails, personnaliser **Confirm sign up** ET
**Magic link or OTP**. Même objet possible : « Votre code LivreDor ».
Utiliser dans les deux :

```html
<h2>Votre code LivreDor</h2>
<p>Saisissez ce code sur la page de connexion :</p>
<p style="font-size:28px;font-weight:bold">{{ .Token }}</p>
<p>Ce code est temporaire. Ne le partagez avec personne.</p>
<p>Si vous n'avez rien demandé, ignorez cet email.</p>
```

La première connexion peut utiliser le modèle d'inscription ; les suivantes
utilisent celui de connexion. Un seul modèle modifié explique donc la réception
du texte « Confirm your email address ». Ne pas désactiver la confirmation email
pour contourner ce problème. Le code applicatif utilise `signInWithOtp` et
`verifyOtp` avec `type: "email"`.

Référence : [modèles Supabase et Token](https://supabase.com/docs/guides/auth/auth-email-templates).

## 5. URL, limites et recette

Dans Authentication → URL Configuration, définir la Site URL correspondant à
l'environnement, puis les URL de retour autorisées pour localhost et le site
HTTPS de recette. Éviter les jokers larges en production.

Vérifier Authentication → Rate Limits et les quotas Resend : un SMTP personnalisé
ne supprime pas les limites Supabase. Ne pas figer un quota dans cette procédure :
le vérifier dans les comptes avant des essais collectifs. Le SMTP Supabase par
défaut est limité et n'est pas destiné à la production.
[Référence SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

```powershell
npm run dev
```

Depuis un projet, essayer une nouvelle adresse réelle/alias, recevoir un code,
le saisir et vérifier le retour au projet. Rejouer avec la même adresse, puis
avec le deuxième organisateur invité. Resend n'ajoute **pas** d'email d'invitation
organisateur : le lien se transmet toujours manuellement.

Si l'email manque : vérifier les logs Auth Supabase et les envois Resend, domaine
et expéditeur, SMTP, quotas, rebonds et dossier indésirable. Si Resend indique
une livraison, cela ne garantit pas l'arrivée en boîte principale. Pour une erreur
429, attendre le délai autorisé avant de redemander. Utiliser uniquement le
dernier code reçu, sans copier codes, clés ou logs sensibles dans le chat.

Avant mise en ligne : reprendre [la recette et les limites](13-V1-OPERATIONS.md),
configurer le CORS R2 pour l'origine HTTPS choisie, consentement et conservation.
Ni l'installation SMTP ni un push Git ne publient automatiquement l'application.
