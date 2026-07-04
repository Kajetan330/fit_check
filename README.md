# FitCheck

FitCheck is a web-first MVP for a fashion creator platform: shareable creator profiles, polished style content, and productised styling services that turn creator trust into structured bookings.

The MVP follows the project PDFs' strongest practical direction: one responsive product, mobile-first customer browsing, and a streamlined creator Studio. Native iOS/Android apps are intentionally out of scope for launch; the app is built as a mobile-ready PWA-style web experience.

## Current Stack

- React + TypeScript
- Vite
- React Router
- Local mock data and browser storage for MVP persistence
- Responsive CSS with no backend dependency

## Run Locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## MVP Scope

The working MVP includes:

- Discovering creators through editorial cards, search, filters, Rising Stars, and a short style quiz.
- Viewing a shareable creator profile with hero, pinned work, services, posts, portfolio, designer pieces, and reviews.
- Booking a service through a guided intake flow with clear scope, turnaround, price, mock escrow, and confirmation.
- Managing a lightweight customer area with closet items, saved creators/posts, and booking history.
- Giving creators a Studio surface for booking triage, profile/service management, lookbook assembly, and earnings snapshots.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the audit, implementation plan, and remaining work.

## Test

```bash
npm run check
```

The check script runs the browser production build and type-checks the serverless Stripe API files.

## Deploy

The app is static and can be deployed to Vercel, Netlify, Cloudflare Pages, or any static host:

```bash
npm run build
```

Deploy the `dist/` directory. SPA rewrites are included for Vercel (`vercel.json`) and Netlify (`public/_redirects`).

## Production Integrations

The app runs without credentials in demo mode. Production-ready scaffolding is included for:

- Supabase auth, database, storage, RLS policies, moderation, disputes, reviews, and bookings.
- Stripe checkout and webhook serverless functions.
- PWA service worker shell caching.
- Admin, launch readiness, and legal draft routes.

See [Production Setup](docs/PRODUCTION_SETUP.md) and [QA Checklist](docs/QA_CHECKLIST.md).
