# Suivi Accessibilite - Le Singe Du Numerique

Derniere mise a jour: 2 avril 2026

## Statut global

- Etat affiche sur le site: `non conforme` (pas d'audit RGAA formel a ce jour).
- Demarche en cours: amelioration continue + verifications internes.
- Verification technique recente: `npm run build` passe (Astro build OK le 2 avril 2026).

## Travaux accessibilite deja en place

### 1) Structure et navigation

- Langue du document definie (`<html lang="fr">`).
- Lien d'evitement vers le contenu principal (`skip-link` vers `#main-content`).
- Region principale identifiee (`<main id="main-content">`).
- Navigation principale et mobile avec libelles explicites (`aria-label`).
- Page courante indiquee dans les menus (`aria-current="page"`).

References:
- `src/layouts/SiteLayout.astro`
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[article]/index.astro`

### 2) Navigation clavier / menu mobile

- Bouton menu mobile avec `aria-expanded`, `aria-controls`, `aria-label` dynamique.
- Menu mobile masque/affiche proprement (`hidden`, `aria-hidden`, `inert`).
- Piege de focus dans le menu mobile (Tab / Shift+Tab).
- Fermeture du menu avec `Escape`.
- Retour du focus vers l'element precedent a la fermeture.

References:
- `src/layouts/SiteLayout.astro`
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/blog/[article]/index.astro`

### 3) Focus visible et lisibilite interactive

- Styles `:focus-visible` globaux sur liens, boutons, champs et elements focusables.
- Contraste visuel de l'outline de focus present.
- Etat visuel explicite pour element actif de navigation (`aria-current`).

References:
- `src/layouts/SiteLayout.astro`
- `src/styles/home.css`
- `src/pages/blog/index.astro`
- `src/pages/blog/[article]/index.astro`

### 4) Formulaires et retours utilisateurs

- Champs du formulaire contact correctement labels.
- Champs obligatoires natifs (`required`) + types semantiques (`email`, `tel`, etc.).
- Zone de statut formulaire annoncee aux lecteurs d'ecran (`aria-live="polite"`).
- Messages d'erreur de recherche (home) annonces et liaison d'aide (`aria-describedby`, `aria-invalid`).
- Feedback de copie du lien dans le module de partage (`aria-live="polite"`).

References:
- `src/pages/contact.astro`
- `src/pages/index.astro`
- `src/components/ShareButtons.astro`

### 5) Gestion mouvement / animations

- Reduction des animations quand preference systeme "reduced motion" detectee (home CSS).
- Controle JS pour eviter des animations trop rapides (duree minimale imposee).

References:
- `src/styles/home.css`
- `src/layouts/SiteLayout.astro`

### 6) Contenus non textuels et icones

- Logos decoratifs correctement ignores par technologies d'assistance (`alt=""` + `aria-hidden="true"`).
- SVG decoratifs marques en `aria-hidden="true"` quand pertinent.
- Cartographie iframe avec `title` present sur la page contact.

References:
- `src/layouts/SiteLayout.astro`
- `src/pages/index.astro`
- `src/pages/blog/index.astro`
- `src/pages/contact.astro`

### 7) Page de transparence accessibilite

- Page dediee a la demarche (`/accessibilite`): statut, travaux realises, methode de verification, canal de signalement.

Reference:
- `src/pages/accessibilite.astro`

## Ce qui est confirme comme fonctionnel aujourd'hui

- Build statique complet du site valide (`npm run build`, 2 avril 2026).
- Parcours clavier principal implemente (skip link, menu, focus management).
- Retours dynamiques annonces sur des zones critiques (`aria-live` sur partage, contact, resultats/etat).
- Menu mobile utilisable au clavier avec fermeture et focus management.

## Verifications deja documentees dans le projet

Selon la page accessibilite:
- Navigation clavier seule.
- VoiceOver sur macOS.
- Verifications manuelles de structure/libelles/ordre de navigation.
- Controle technique via navigateur et build Astro.

Reference:
- `src/pages/accessibilite.astro`

## Points encore ouverts (a suivre)

- Audit RGAA formel non realise.
- Validation complementaire par tests utilisateurs reels.
- Relecture systematique des nouveaux contenus/composants avant publication.
- Stabilisation finale avant declaration de conformite plus formelle.

## Historique de preuve

- 2026-04-02: verification locale `npm run build` reussie.
