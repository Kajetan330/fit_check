-- Service loop primitives: messages, revisions, approval timestamps.

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

alter table public.booking_messages enable row level security;

drop policy if exists "participants read messages" on public.booking_messages;
create policy "participants read messages" on public.booking_messages
  for select using (exists (
    select 1
    from public.bookings b
    left join public.creator_profiles cp on cp.id = b.creator_id
    where b.id = booking_id
      and (b.customer_id = auth.uid() or cp.user_id = auth.uid() or public.is_admin())
  ));

drop policy if exists "participants write messages" on public.booking_messages;
create policy "participants write messages" on public.booking_messages
  for insert with check (sender_id = auth.uid() and exists (
    select 1
    from public.bookings b
    left join public.creator_profiles cp on cp.id = b.creator_id
    where b.id = booking_id
      and (b.customer_id = auth.uid() or cp.user_id = auth.uid() or public.is_admin())
  ));

create table if not exists public.revision_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  note text not null check (char_length(note) between 1 and 4000),
  status text not null default 'open' check (status in ('open', 'delivered', 'declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.revision_requests enable row level security;

drop policy if exists "participants read revision requests" on public.revision_requests;
create policy "participants read revision requests" on public.revision_requests
  for select using (exists (
    select 1
    from public.bookings b
    left join public.creator_profiles cp on cp.id = b.creator_id
    where b.id = booking_id
      and (b.customer_id = auth.uid() or cp.user_id = auth.uid() or public.is_admin())
  ));

drop policy if exists "customers create revision requests" on public.revision_requests;
create policy "customers create revision requests" on public.revision_requests
  for insert with check (requested_by = auth.uid() and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.customer_id = auth.uid()
  ));

alter table public.bookings
  add column if not exists approved_at timestamptz,
  add column if not exists approval_deadline timestamptz,
  add column if not exists problem_reported_at timestamptz;

create index if not exists bookings_approval_deadline_idx
  on public.bookings (approval_deadline)
  where approved_at is null and problem_reported_at is null;
