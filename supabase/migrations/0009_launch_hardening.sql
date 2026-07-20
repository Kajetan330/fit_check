-- Launch hardening: booking activation, draft uploads, service detail fields,
-- controlled storefront customization, and email/approval guards.

alter table public.bookings
  add column if not exists activated_at timestamptz,
  add column if not exists reminder_sent_at timestamptz,
  add column if not exists delivery_email_sent_at timestamptz;

update public.bookings
set activated_at = coalesce(activated_at, created_at)
where activated_at is null
  and stripe_checkout_session_id is not null;

create table if not exists public.draft_uploads (
  id uuid primary key default gen_random_uuid(),
  draft_token_hash text not null,
  storage_path text not null,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  claimed_booking_id uuid references public.bookings(id) on delete set null
);

create index if not exists draft_uploads_token_idx on public.draft_uploads (draft_token_hash);
create index if not exists draft_uploads_unclaimed_created_idx
  on public.draft_uploads (created_at)
  where claimed_booking_id is null;

alter table public.draft_uploads enable row level security;

alter table public.creator_profiles
  add column if not exists accent_color text
    check (accent_color in ('claret','ink','moss','ocean','amber')),
  add column if not exists hero_path text,
  add column if not exists custom_headline text check (char_length(custom_headline) <= 80);

alter table public.services
  add column if not exists not_for text[] not null default '{}',
  add column if not exists you_send text,
  add column if not exists you_receive text,
  add column if not exists customer_effort_mins integer check (customer_effort_mins between 1 and 240),
  add column if not exists revision_terms text,
  add column if not exists example_result_image text;

alter table public.reviews
  add column if not exists verified boolean not null default false;

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
          'repeat_booking_started',
          'booking_message_sent',
          'delivery_ready',
          'revision_requested',
          'redelivery_ready',
          'problem_reported',
          'booking_reviewed'
        )
      );
  end if;
end $$;
