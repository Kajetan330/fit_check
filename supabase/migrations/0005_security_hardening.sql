-- 0005_security_hardening.sql
-- Consolidates launch-critical RLS hardening after 0003/0004.

-- Keep profile owners from changing their role even if an older update policy
-- from 0001 is still present in the live project.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception 'role cannot be changed by the profile owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "Users can update own profile details" on public.profiles;
create policy "Users can update own profile details" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Do not let anonymous clients flood analytics. Server-side API writes use the
-- service role and bypass RLS; signed-in clients may only write their own event.
drop policy if exists "Anyone may create limited commerce events" on public.commerce_events;
drop policy if exists "Authenticated users create limited commerce events" on public.commerce_events;
drop policy if exists "Authenticated users create own commerce events" on public.commerce_events;
create policy "Authenticated users create own commerce events" on public.commerce_events
  for insert
  to authenticated
  with check (user_id = auth.uid());
