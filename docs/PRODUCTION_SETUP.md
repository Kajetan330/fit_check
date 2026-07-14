# Production Setup

ByTaste now runs in demo mode without credentials and is wired for production services when environment variables are added.

## 1. Supabase

Create a Supabase project, then run:

```sql
-- Supabase SQL editor
-- paste and run supabase/migrations/0001_initial_schema.sql
-- then paste and run supabase/migrations/0002_checkout_sessions.sql
-- then paste and run supabase/migrations/0003_paid_edits_and_entitlements.sql
-- then paste and run supabase/migrations/0004_profiles.sql
-- then paste and run supabase/migrations/0005_security_hardening.sql
-- then paste and run supabase/migrations/0006_taste_item_verdict.sql
-- sign in once through the app so public.profiles has an owner row
-- then paste and run supabase/seed/0001_seed_catalog.sql
```

The seed mirrors the current creator catalog into Supabase: creator profiles, service prices, paid edits, product picks, outfit formulas, and referral links. It is idempotent. If it reports that it was skipped, create one auth-backed profile first, then rerun it.

Add these frontend variables in Vercel and `.env.local`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Add this server-only variable in Vercel:

```bash
SUPABASE_SERVICE_ROLE_KEY=
```

Also configure Auth redirect URLs:

```text
http://127.0.0.1:5173
http://127.0.0.1:5173/**
https://your-production-domain.com
https://your-production-domain.com/**
```

For Google sign-in, enable the Google provider in Supabase Auth, add the provider credentials, and keep email magic link enabled as the fallback path.

## 2. Stripe

Create a Stripe account and add:

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Webhook endpoint:

```text
https://your-production-domain.com/api/stripe-webhook
```

Recommended events:

```text
checkout.session.completed
payment_intent.payment_failed
charge.refunded
```

The legacy booking checkout function is at `api/create-checkout-session.ts` and validates service prices server-side. The trusted commerce checkout function is at `api/create-commerce-checkout.ts`. The webhook validates events and updates booking/payment records.

## 3. Deploy

```bash
npm install
npm run check
```

Deploy to Vercel. The included `vercel.json` handles SPA routing.

## 4. Launch Safety

Before taking real bookings:

- External stock URLs have been removed. Before public launch, replace generated placeholder people/customer imagery with creator-owned or professionally licensed media and signed releases.
- Use `docs/LEGAL_REVIEW_PACKET.md` with counsel before accepting real payments.
- Finalize Terms, Privacy, Creator Terms, and Refund Policy with counsel.
- Verify private upload bucket policies in Supabase.
- Test Stripe checkout in test mode.
- Test creator/customer booking visibility with separate accounts.
- Configure an email provider for transactional notifications.
