# Supabase Setup

This folder contains the production database foundation for FitCheck.

## Apply Locally

```bash
supabase start
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
4. Add the values from the project settings to `.env.local`.

## Buckets

The migration creates two buckets:

- `public-media`: public creator profile, post, portfolio, and designer piece images.
- `private-booking-uploads`: private customer closet and booking intake uploads.

The storage policies assume the authenticated user path convention:

```text
{auth.uid()}/filename.jpg
```

Creator/admin access to private booking uploads should be tightened further once the backend API is connected to booking ownership checks.
