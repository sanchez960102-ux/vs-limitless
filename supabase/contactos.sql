-- VS Limitless · Contactos de la calculadora de zonas (landing). El público solo inserta; el coach gestiona.
create table if not exists public.contactos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 80),
  whatsapp text not null check (char_length(whatsapp) between 8 and 20),
  fuente text not null default 'calculadora_zonas' check (fuente in ('calculadora_zonas')),
  datos jsonb not null default '{}'::jsonb,
  estado text not null default 'nuevo' check (estado in ('nuevo','contactado','descartado')),
  created_at timestamptz not null default now()
);
create index if not exists contactos_fecha on public.contactos (created_at desc);
alter table public.contactos enable row level security;
grant insert on public.contactos to anon;
grant select, update, delete on public.contactos to authenticated;
drop policy if exists "publico deja su contacto" on public.contactos;
create policy "publico deja su contacto" on public.contactos for insert to anon
  with check (estado = 'nuevo' and fuente = 'calculadora_zonas' and pg_column_size(datos) < 2000);
drop policy if exists "coach gestiona contactos" on public.contactos;
create policy "coach gestiona contactos" on public.contactos for all to authenticated using (public.es_coach()) with check (public.es_coach());
