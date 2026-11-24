-- VS Limitless · Composición corporal (InBody). El coach captura; cada miembro solo lee lo suyo.
create table if not exists public.composicion (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  fecha date not null default (now() at time zone 'America/Guatemala')::date,
  peso numeric(5,1),
  pct_grasa numeric(4,1),
  musculo_esqueletico numeric(5,1),
  grasa_visceral numeric(4,1),
  agua numeric(5,1),
  magra_brazo_der numeric(5,2), grasa_brazo_der numeric(5,2),
  magra_brazo_izq numeric(5,2), grasa_brazo_izq numeric(5,2),
  magra_tronco numeric(5,2),    grasa_tronco numeric(5,2),
  magra_pierna_der numeric(5,2), grasa_pierna_der numeric(5,2),
  magra_pierna_izq numeric(5,2), grasa_pierna_izq numeric(5,2),
  nota text,
  created_at timestamptz not null default now()
);
create index if not exists composicion_miembro on public.composicion (miembro_id, fecha);
alter table public.composicion enable row level security;
grant select, insert, update, delete on public.composicion to authenticated;
drop policy if exists "coach total" on public.composicion;
create policy "coach total" on public.composicion for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "lee su composicion" on public.composicion;
create policy "lee su composicion" on public.composicion for select to authenticated using (miembro_id = auth.uid());
