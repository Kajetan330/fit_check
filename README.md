# ByTaste

ByTaste is a web-first MVP for a fashion creator platform: creators share one storefront link, followers send private styling briefs, and paid services move through booking, checkout, delivery, revision, and approval.

The MVP follows the project PDFs' strongest practical direction: one responsive product, mobile-first customer browsing, and a streamlined creator Studio. Native iOS/Android apps are intentionally out of scope for launch; the app is built as a mobile-ready PWA-style web experience.

## Current Stack

- React + TypeScript
- Vite
- React Router
- Local mock data and browser storage for demo persistence
- Optional Supabase auth/database/storage and Stripe checkout endpoints
- Responsive CSS with mobile-first storefront and booking flows

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

- A marketing homepage that explains the creator-link-first model without a public creator directory.
- Viewing a shareable creator storefront with primary offer, taste signature, proof, services, public edits, and reviews.
- Booking a service through a public-first guided intake flow with service recap, goal, photos, review/auth, pay, draft persistence, payment-hold copy, and confirmation.
- Managing a lightweight customer area with closet items, saved creators/posts, and booking history.
- Giving creators a Studio surface for booking triage, storefront/service management, paid edits, share links, QR code, tracked-link builder, and earnings snapshots.

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
- Social-first migrations `0007_social_first.sql` and `0008_service_loop.sql` for primary offers, attribution, waitlists, messages, revisions, and approval timestamps.
- Serverless endpoints for booking creation, referral-link creation, event tracking, and cron-gated auto-approval.
- PWA service worker shell caching.
- Admin, launch readiness, and legal draft routes.
- Original local placeholder media replacing remote stock URLs.
- Brand mark, wordmark, and PWA icon assets.
- Launch policy decisions for take rate, refunds, revisions, and creator payouts.

For the latest developer handoff, start with [Next Developer Handoff](docs/NEXT_DEVELOPER_HANDOFF.md). For a concise history of the July 14 implementation work, see [Recent Changes Report](docs/RECENT_CHANGES_REPORT_2026-07-14.md).

See [Production Setup](docs/PRODUCTION_SETUP.md), [Commerce Implementation Status](docs/COMMERCE_IMPLEMENTATION_STATUS.md), [Final Finish Plan](docs/FINAL_FINISH_PLAN.md), [QA Checklist](docs/QA_CHECKLIST.md), [Brand Assets](docs/BRAND_ASSETS.md), [Media Provenance](docs/MEDIA_PROVENANCE.md), [Platform Policies](docs/PLATFORM_POLICIES.md), and [Legal Review Packet](docs/LEGAL_REVIEW_PACKET.md).
