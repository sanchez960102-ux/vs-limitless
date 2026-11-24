-- VS Limitless · Registro de cargas por serie (progresión de pesos)
create table if not exists public.cargas (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  ejercicio text not null,
  clave text not null,            -- nombre normalizado para seguir el mismo ejercicio entre semanas
  fecha date not null default (now() at time zone 'America/Guatemala')::date,
  series jsonb not null default '[]'::jsonb,   -- [{kg, reps}]
  top_kg numeric,
  e1rm numeric,
  volumen numeric,
  created_at timestamptz not null default now(),
  unique (item_id)
);
create index if not exists cargas_miembro_clave on public.cargas (miembro_id, clave, fecha);
alter table public.cargas enable row level security;
grant select, insert, update, delete on public.cargas to authenticated;
drop policy if exists "coach total" on public.cargas;
create policy "coach total" on public.cargas for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "sus cargas" on public.cargas;
create policy "sus cargas" on public.cargas for all to authenticated
  using (miembro_id = auth.uid() and public.al_dia()) with check (miembro_id = auth.uid() and public.al_dia());
