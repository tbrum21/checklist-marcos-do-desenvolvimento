-- Add superadmin role, email cache, active flag, and first-access password change flag to profiles
alter table public.profiles
  add column if not exists email text not null default '',
  add column if not exists role text not null default 'psychologist' check (role in ('superadmin', 'psychologist')),
  add column if not exists must_change_password boolean not null default false,
  add column if not exists active boolean not null default true;

create index if not exists idx_profiles_role on public.profiles (role);

-- Prevent authenticated users from escalating their own role or changing active status
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.role is distinct from old.role then
      raise exception 'Not allowed to modify role';
    end if;
    if new.active is distinct from old.active then
      raise exception 'Not allowed to modify active status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.prevent_profile_privilege_escalation();

-- Harden insert policy so client-side inserts can never self-assign superadmin
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (
    (select auth.uid()) = id
    and role = 'psychologist'
    and active = true
  );
