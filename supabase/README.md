# Supabase Setup

This folder contains the production database foundation for FitCheck.

## Apply Locally

```bash
npm install
supabase start
supabase db reset
```

The local CLI config lives in `supabase/config.toml`. `supabase db reset` applies the migrations and then runs `seed/0001_seed_catalog.sql`.

Important: the catalog seed uses an existing auth-backed row in `public.profiles` as the owner for seeded creators. If your local database is empty, start the app, sign in once with email, then rerun:

```bash
supabase db reset
```

## Apply In Supabase Cloud

1. Create a Supabase project.
2. Open SQL Editor.
3. Run migrations in order:
   - `migrations/0001_initial_schema.sql`
   - `migrations/0002_checkout_sessions.sql`
   - `migrations/0003_paid_edits_and_entitlements.sql`
   - `migrations/0004_profiles.sql`
   - `migrations/0005_security_hardening.sql`
4. Sign in once through the production app so `public.profiles` has an owner row.
5. Run `seed/0001_seed_catalog.sql` in SQL Editor to seed the creator catalog, services, paid edits, item picks, outfit formulas, and referral links.
6. Add the values from the project settings to `.env.local`.

The seed is idempotent. If it says it was skipped, create or confirm at least one profile row, then run it again.

## Buckets

The migration creates two buckets:

- `public-media`: public creator profile, post, portfolio, and designer piece images.
- `private-booking-uploads`: private customer closet and booking intake uploads.
- `paid-product-media`: creator-owned media for paid edit products and items.

The storage policies assume the authenticated user path convention:

```text
{auth.uid()}/filename.jpg
```

Creator/admin access to private booking uploads should be tightened further once the backend API is connected to booking ownership checks.
