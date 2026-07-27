# SunRed — Outcall Massage Booking App

Booking platform for SunRed.vip, a premium outcall massage service in Bangkok. Guests browse practitioners and services, reserve a session, and pay by cash/PromptPay/WeChat/Alipay; admins manage bookings, therapists, and payouts from an internal dashboard.

## Tech Stack
- React 18 + Vite + TypeScript
- MUI (Material UI), Framer Motion
- Firebase (Auth, Firestore, Cloud Functions, Hosting)
- Google Maps API, i18next (5 languages: en/th/zh/ja/ko)
- Deployed on [Vercel](https://vercel.com/) (auto-deploy on push to `main`)

## Develop & Run Locally

```sh
npm install
npm run dev          # starts the Vite dev server
```

Other scripts (see `package.json`):

```sh
npm run typecheck    # tsc --noEmit
npm run lint          # eslint
npm run check         # typecheck + lint
npm run build          # vite build + prerender (mirrors the Vercel build)
npm run preview        # preview a production build locally
```

## Project Structure

- `src/pages/`, `src/components/` — routed pages and UI, organized by feature (`booking/`, `therapist/`, `admin/`, `user/`) with some shared/type-based folders (`common/`, `layouts/`)
- `src/hooks/`, `src/utils/` — React hooks and pure helpers
- `src/data/` — service catalog, therapist roster
- `src/locales/` — i18n translation files
- `functions/` — Firebase Cloud Functions (booking lifecycle, Telegram bots)
- `scripts/` — one-off admin/ops scripts (Firestore audits, migrations) plus the build-time prerender step
- `docs/` — strategy, brand, SEO, and channel-setup documentation
- `firestore.rules`, `firestore.indexes.json` — Firestore security rules and indexes

## Project Memory

**`CLAUDE.md`** at the repo root is the canonical source of truth for business context, brand voice, pricing, and marketing rules — read it before making product or content decisions. `CLAUDE-HISTORY.md` has the full round-by-round build changelog.

## Deploy

- **Frontend**: automatic on push to `main` via Vercel (see `.github/workflows/`)
- **Firestore rules / indexes**: manual — `firebase deploy --only firestore:rules` / `--only firestore:indexes`
- **Cloud Functions**: manual — `firebase deploy --only functions`
