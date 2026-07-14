# FitCheck Next Developer Handoff

Last updated: July 14, 2026

Production URL: https://fit-check-ecru.vercel.app

Latest pushed implementation commits before this handoff:

```text
e7d16f4 Remove style quiz; update handoff note + Phase 2 spec
2da77e0 feat: scaffold creator commerce and paid edits
```

## Current State

### Change 2026-07-14: Real Auth Foundation, Commerce Freeze, Analytics

Implemented from `docs/FITCHECK_PHASE2_SPEC.md` with a bookings-first launch decision:

- **Real Supabase auth**: `src/lib/auth.ts` adds Google OAuth, email magic link, and session-to-user mapping with graceful fallback when `profiles` is missing. Session lifecycle is mirrored into app state, `/auth/callback` exists, customer sign-in has no name field or internal wording, and `signOut` ends the Supabase session too.
- **Profiles migration**: `supabase/migrations/0004_profiles.sql` adds `profiles`, a signup trigger, RLS, and a role-escalation guard. Manual step: run 0004 in the Supabase SQL Editor and enable the Google provider. Magic link can work with Supabase default email settings.
- **Commerce freeze**: paid-edit purchasing is gated behind `VITE_COMMERCE_ENABLED` in `src/lib/commerce.ts`. Until the flag is `true` in Vercel, the buy button renders as "Paid edits launch soon" and checkout cannot start. Bookings are unaffected. Flip it on only after migration 0003 is applied and seeded.
- **Trust fixes**: `/launch` now renders NotFound for non-admins. Paid-edit reader internals are DEV-only. Edit-page and sign-in copy no longer mention Supabase, entitlements, or demo auth in customer-facing production surfaces.
- **Funnel analytics**: `@vercel/analytics` is mounted in `main.tsx`; events include `creator_profile_viewed`, `edit_viewed`, `edit_checkout_clicked`, `booking_started`, `checkout_redirected`, `auth_gate_shown`, `signin_google_clicked`, `signin_magic_link_sent`, and `auth_completed`.
- **Homepage**: new `#how-it-works` section with three steps, including the payment-hold language. Guest nav "How it works" points at that section.

Remaining from the Phase 2 spec: booking wizard guest-draft preservation (D1), profile restructure (B5), and Supabase-backed creator/service/paid-edit data.

### Change 2026-07-14: Style Quiz Removed

The Style Quiz has been removed from the product entirely. The implementation follows `docs/FITCHECK_PHASE2_SPEC.md`, Workstream A:

- `StyleQuizPage`, `quizLooks`, `QuizLook`, and `.quiz-*` styles were deleted.
- `/quiz` now redirects to `/` so old links do not 404.
- Homepage and navigation quiz CTAs were removed.
- README, project status, and QA checklist were updated.
- No localStorage migration is needed because quiz progress was never persisted.

Phase 2 status:

- Workstream A is complete.
- Trust sprint work is partially complete.
- Real Supabase auth foundation is partially implemented.
- Booking wizard, analytics verification, and edits-lite remain.

FitCheck is a responsive React/Vite fashion-tech MVP with seeded creator data, local demo state, Supabase schema migrations, Vercel serverless API routes, and Stripe checkout/webhook scaffolding.

The latest work added the first real architecture for creator-led monetisation:

- creator storefront routes;
- paid edit landing pages;
- customer library and paid edit reader prototype;
- creator Studio entries for storefront, edits, and analytics;
- trusted server-side checkout endpoint for paid edits and real booking UUIDs;
- webhook entitlement grant/revoke handling;
- paid edit access API;
- controlled share-link API;
- private media signed URL API;
- generated static social-preview pages under `public/share`;
- Supabase migration `0003_paid_edits_and_entitlements.sql`.

The app still supports the original demo journey. Do not remove the seeded/local flow until Supabase-backed creator, service, booking, and paid-edit data has been fully wired and tested.

## Important Files

- `src/App.tsx` - main routes and product UI. Contains storefronts, paid edit pages, customer library, Studio pages, booking flow, auth callback, and auth gates.
- `src/data.ts` - seeded creators, services, posts, paid edits, purchases, and entitlement demo data.
- `src/types.ts` and `src/types/commerce.ts` - app and commerce domain models.
- `src/state.tsx` - local MVP state store plus Supabase auth session mirroring.
- `src/lib/auth.ts` - Supabase Google OAuth, magic-link auth, redirect preservation, sign-out, and session-to-user mapping.
- `src/lib/commerce.ts` - frontend helper for trusted commerce checkout and `VITE_COMMERCE_ENABLED` freeze flag.
- `src/lib/sharing.ts` - referral capture, safe redirects, and share URL helpers.
- `src/features/sharing/ShareButton.tsx` - Web Share API with clipboard/manual fallback.
- `api/create-commerce-checkout.ts` - trusted checkout endpoint. Browser should send only trusted IDs, not price/title.
- `api/stripe-webhook.ts` - Stripe webhook with idempotency and paid-edit entitlement handling.
- `api/paid-edit-access.ts` - entitlement-gated paid edit read API.
- `api/create-share-link.ts` and `api/shared-resource.ts` - controlled share-link creation and read flow.
- `api/media/signed-url.ts` - authorised private media signed URL flow.
- `supabase/migrations/0003_paid_edits_and_entitlements.sql` - paid edit, purchase, entitlement, referral, share, and commerce-event schema.
- `supabase/migrations/0004_profiles.sql` - Supabase auth profile table, signup trigger, RLS, and role guard.
- `scripts/generate-share-pages.mjs` - build-time static share/OG page generator.
- `docs/COMMERCE_IMPLEMENTATION_STATUS.md` - implementation status for the commerce slice.
- `docs/FITCHECK_PHASE2_SPEC.md` - Phase 2 plan and acceptance criteria.

## What Is Real Versus Prototype

Real/scaffolded production controls:

- Supabase auth session plumbing now exists and can map sessions to app users.
- Paid edit access is modeled through `product_entitlements`.
- Checkout prices are designed to load server-side from Supabase.
- Paid-edit checkout is frozen behind `VITE_COMMERCE_ENABLED` until the database is ready.
- Webhook processing records Stripe event IDs to reduce duplicate processing.
- Controlled share links store SHA-256 token hashes, not raw tokens.
- Private media access is mediated through signed URL APIs.
- Customer sign-in no longer exposes public creator/admin role switching.
- `/launch` is now admin-only in the UI route guard.

Still prototype/demo:

- Most visible app data still comes from `src/data.ts` and `localStorage`.
- Creator Studio forms do not yet write to Supabase.
- Booking creation still has legacy demo behavior unless a real booking UUID exists.
- Paid edit products, items, outfits, services, and creators need real Supabase seed data before secure paid-edit checkout can be tested end to end.
- Static share pages are generated SVG/HTML cards for seeded data only.
- The booking wizard still needs guest-draft preservation and the progressive conversion pass.

## Required Manual Setup Before The Next Full Test

1. Run `supabase/migrations/0003_paid_edits_and_entitlements.sql` in the Supabase SQL Editor.
2. Run `supabase/migrations/0004_profiles.sql` in the Supabase SQL Editor.
3. Enable Google provider in Supabase Auth if you want the Google button live.
4. Verify these commerce tables exist:
   - `taste_products`
   - `taste_product_items`
   - `taste_product_outfits`
   - `purchases`
   - `product_entitlements`
   - `controlled_share_links`
   - `creator_referral_links`
   - `commerce_events`
   - `stripe_events`
5. Verify the `paid-product-media` storage bucket exists.
6. Seed real Supabase rows for creators, creator profiles, services, paid edits, paid edit preview/full items, and outfits.
7. Only after 0003 is applied and seeded, set `VITE_COMMERCE_ENABLED=true` in Vercel if paid-edit purchasing should launch.
8. Test paid-edit checkout using a real `taste_products.id`.
9. Confirm Stripe webhook creates or activates the matching `product_entitlements` row.

## Recommended Next Engineering Phase

Do this in small commits:

1. Finish the booking wizard with guest-draft preservation.
2. Move seeded creators/services/paid edits into Supabase seed data.
3. Add typed Supabase query helpers for creators, services, and paid edits.
4. Update storefront and paid-edit landing pages to read from Supabase, with fallback seeded data only for local demo mode.
5. Update the paid-edit reader to call `/api/paid-edit-access` with the Supabase session token.
6. Replace legacy booking checkout from browser-provided service details with the trusted `booking` path in `/api/create-commerce-checkout`.
7. Wire creator Studio forms to Supabase writes and RLS.
8. Add integration tests or scripted smoke tests for checkout, webhook, entitlement, signed media, controlled share links, and auth.

## Safety Notes

- Do not commit `.env` files, Stripe keys, Supabase service keys, webhook secrets, or dashboard screenshots containing credentials.
- Do not make private storage buckets public to solve access problems. Use signed URL endpoints.
- Do not accept price, currency, title, or creator handle from the browser for production checkout.
- Do not remove local demo data until the Supabase-backed flow is fully replacement-ready.
- Keep Vercel production health checks free of secret values.

## Last Verified

On July 13, 2026:

- `npm run check` passed.
- A secret-pattern scan found no committed Stripe/Supabase key patterns.
- Local preview returned HTTP 200 for new creator, paid-edit, library, and static share routes.
- Vercel served the generated static share page after the push.
- Production `/api/health` returned configured Stripe/Supabase status with `checkout_sessions` reachable.
