# Decap OAuth sur Vercel

Ce dossier contient un mini projet Astro dédié au service OAuth de `Decap CMS`.

But :

- héberger uniquement les routes `/oauth` et `/oauth/callback`
- laisser le site public principal sur O2Switch
- utiliser GitHub comme fournisseur d'authentification pour l'admin

## Déploiement visé

- site public : `https://lesingedunumerique.fr`
- service OAuth : par exemple `https://oauth.lesingedunumerique.fr`

## Variables d'environnement à définir sur Vercel

- `OAUTH_GITHUB_CLIENT_ID`
- `OAUTH_GITHUB_CLIENT_SECRET`
- `PUBLIC_DECAP_CMS_VERSION` (optionnel)

## App OAuth GitHub

Créer une OAuth App GitHub avec :

- Homepage URL : l'URL publique du service OAuth Vercel
- Authorization callback URL : l'URL publique du service OAuth suivie de `/oauth/callback`

Exemple :

- Homepage URL : `https://oauth.lesingedunumerique.fr`
- Callback URL : `https://oauth.lesingedunumerique.fr/oauth/callback`

## Mise à jour du site principal

Quand le service Vercel est en ligne, adapter `public/admin/config.yml` dans le site principal :

```yml
backend:
  name: github
  repo: Stan69000/lesingedunumerique
  branch: main
  site_domain: lesingedunumerique.fr
  base_url: https://oauth.lesingedunumerique.fr
  auth_endpoint: oauth
```

## Commandes locales

```bash
npm install
npm run dev
```

L'URL utile sera ensuite :

- `/oauth`
- `/oauth/callback`
