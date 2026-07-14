# ByTaste

ByTaste is a web-first MVP for a fashion creator platform: shareable creator profiles, polished style content, and productised styling services that turn creator trust into structured bookings.

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

- Discovering creators through editorial cards, search, filters, and Rising Stars.
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

The app is deployed on Vercel:

```bash
npm run build
```

Deploy the `dist/` directory. SPA rewrites are included for Vercel in `vercel.json`.

## Production Integrations

The app runs without credentials in demo mode. Production-ready scaffolding is included for:

- Supabase auth, database, storage, RLS policies, moderation, disputes, reviews, and bookings.
- Stripe checkout and webhook serverless functions.
- Checkout status persistence through Supabase migration `0002_checkout_sessions.sql`.
- PWA service worker shell caching.
- Admin, launch readiness, and legal draft routes.
- Original local placeholder media replacing remote stock URLs.
- Brand mark, wordmark, and PWA icon assets.
- Launch policy decisions for take rate, refunds, revisions, and creator payouts.

For the latest developer handoff, start with [Next Developer Handoff](docs/NEXT_DEVELOPER_HANDOFF.md). For a concise history of the July 14 implementation work, see [Recent Changes Report](docs/RECENT_CHANGES_REPORT_2026-07-14.md).

See [Production Setup](docs/PRODUCTION_SETUP.md), [Commerce Implementation Status](docs/COMMERCE_IMPLEMENTATION_STATUS.md), [Final Finish Plan](docs/FINAL_FINISH_PLAN.md), [QA Checklist](docs/QA_CHECKLIST.md), [Brand Assets](docs/BRAND_ASSETS.md), [Media Provenance](docs/MEDIA_PROVENANCE.md), [Platform Policies](docs/PLATFORM_POLICIES.md), and [Legal Review Packet](docs/LEGAL_REVIEW_PACKET.md).
