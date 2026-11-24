-- VS Limitless · Anamnesis inicial (obligatoria para todo miembro, cualquier plan)
create table if not exists public.anamnesis (
  miembro_id uuid primary key references public.perfiles(id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  paso int not null default 0,
  completada boolean not null default false,
  alerta_salud boolean not null default false,
  completada_at timestamptz,
  revisada_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.anamnesis enable row level security;
grant select, insert, update, delete on public.anamnesis to authenticated;
drop policy if exists "coach total" on public.anamnesis;
create policy "coach total" on public.anamnesis for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "ve su anamnesis" on public.anamnesis;
create policy "ve su anamnesis" on public.anamnesis for select to authenticated using (miembro_id = auth.uid());
drop policy if exists "crea su anamnesis" on public.anamnesis;
create policy "crea su anamnesis" on public.anamnesis for insert to authenticated with check (miembro_id = auth.uid() and revisada_at is null);
-- El miembro solo edita mientras no la ha enviado (o cuando el coach le pide actualizarla)
drop policy if exists "edita su anamnesis" on public.anamnesis;
create policy "edita su anamnesis" on public.anamnesis for update to authenticated
  using (miembro_id = auth.uid() and completada = false) with check (miembro_id = auth.uid());
