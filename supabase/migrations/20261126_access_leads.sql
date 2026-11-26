-- Tabela de solicitações de acesso profissional (funil comercial da Landing Page)
-- Política de segurança: inserção pública controlada (insert-only), leitura/gestão exclusiva do superadmin.

create table if not exists public.access_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 140),
  email text not null check (position('@' in trim(email)) > 1 and char_length(trim(email)) <= 200),
  whatsapp text not null check (char_length(trim(whatsapp)) between 8 and 40),
  professional_registry text not null default '' check (char_length(professional_registry) <= 60),
  specialty text not null default 'Psicologia Infantil' check (char_length(specialty) <= 100),
  plan_interest text not null default 'Consultório Individual' check (char_length(plan_interest) <= 100),
  notes text not null default '' check (char_length(notes) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'archived')),
  created_at timestamptz not null default now()
);

create index if not exists access_leads_created_at_idx on public.access_leads (created_at desc);
create index if not exists access_leads_status_created_idx on public.access_leads (status, created_at desc);

alter table public.access_leads enable row level security;
alter table public.access_leads force row level security;

drop policy if exists access_leads_public_insert on public.access_leads;
create policy access_leads_public_insert on public.access_leads
  for insert
  to anon, authenticated
  with check (status = 'new');

drop policy if exists access_leads_superadmin_select on public.access_leads;
create policy access_leads_superadmin_select on public.access_leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'superadmin'
        and p.active = true
    )
  );

drop policy if exists access_leads_superadmin_update on public.access_leads;
create policy access_leads_superadmin_update on public.access_leads
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'superadmin'
        and p.active = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'superadmin'
        and p.active = true
    )
  );

grant insert on public.access_leads to anon, authenticated;
grant select, update on public.access_leads to authenticated;
