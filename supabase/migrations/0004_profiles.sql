-- 0004_profiles.sql
-- Customer identity profiles for real Supabase auth (Phase 2, Workstream C).
-- Run in the Supabase SQL Editor after 0003.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer'
    check (role in ('customer', 'creator', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Role changes are made only with the service role key (admin tooling),
-- never from the client. The update policy intentionally does not allow
-- clients to change role because the column is protected by the trigger
-- below.

create or replace function public.prevent_role_self_escalation()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception 'role cannot be changed by the profile owner';
  end if;
  return new;
end $$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
