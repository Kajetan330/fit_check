-- Social-first pivot support.
-- Additive only: do not drop the deprecated checkout_sessions table yet.

alter table public.creator_profiles
  add column if not exists primary_offer_type text not null default 'service'
    check (primary_offer_type in ('service', 'edit', 'waitlist'));

alter table public.services
  add column if not exists who_for text[] not null default '{}',
  add column if not exists effort_note text;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (creator_id, email)
);

alter table public.waitlist_signups enable row level security;

drop policy if exists "Creators read own waitlist signups" on public.waitlist_signups;
create policy "Creators read own waitlist signups" on public.waitlist_signups
  for select using (public.owns_creator_profile(creator_id) or public.is_admin());

alter table public.commerce_events
  add column if not exists source text,
  add column if not exists campaign text,
  add column if not exists landing_path text;

do $$
begin
  if to_regclass('public.commerce_events') is not null then
    alter table public.commerce_events
      drop constraint if exists commerce_events_event_name_check;
    alter table public.commerce_events
      add constraint commerce_events_event_name_check check (
        event_name in (
          'storefront_view',
          'product_preview_view',
          'service_view',
          'share_clicked',
          'checkout_started',
          'checkout_completed',
          'booking_started',
          'booking_completed',
          'creator_link_opened',
          'storefront_viewed',
          'primary_offer_clicked',
          'service_viewed',
          'brief_completed',
          'auth_completed',
          'delivery_approved',
          'repeat_booking_started'
        )
      );
  end if;
end $$;

create index if not exists commerce_events_creator_created_idx
  on public.commerce_events (creator_id, created_at desc);
create index if not exists commerce_events_name_created_idx
  on public.commerce_events (event_name, created_at desc);

alter table public.purchases
  add column if not exists source text,
  add column if not exists campaign text;

alter table public.bookings
  add column if not exists source text,
  add column if not exists campaign text,
  add column if not exists referral_code text;
