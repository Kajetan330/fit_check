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

The first working version focuses on:

- Discovering creators through editorial cards, search, filters, Rising Stars, and a short style quiz.
- Viewing a shareable creator profile with hero, pinned work, services, posts, portfolio, designer pieces, and reviews.
- Booking a service through a guided intake flow with clear scope, turnaround, price, mock escrow, and confirmation.
- Managing a lightweight customer area with closet items, saved creators/posts, and booking history.
- Giving creators a Studio surface for booking triage, profile/service management, lookbook assembly, and earnings snapshots.

See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the audit, implementation plan, and remaining work.
