-- VS Limitless · tabla de aplicaciones de la landing
-- Ejecutar una sola vez en Supabase → SQL Editor → New query → Run

create table if not exists public.aplicaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  correo text not null check (char_length(correo) between 5 and 160),
  whatsapp text check (char_length(whatsapp) <= 40),
  ciudad text check (char_length(ciudad) <= 120),
  edad int check (edad between 16 and 90),
  objetivo text check (char_length(objetivo) <= 120),
  meta text check (char_length(meta) <= 400),
  nivel text check (char_length(nivel) <= 120),
  dias int check (dias between 1 and 7),
  lugar text check (char_length(lugar) <= 120),
  lesiones text check (char_length(lesiones) <= 600),
  por_que_ahora text check (char_length(por_que_ahora) <= 2000),
  ultima_vez text check (char_length(ultima_vez) <= 2000),
  semana_mala text check (char_length(semana_mala) <= 2000),
  compromiso int check (compromiso between 1 and 10),
  plan text check (plan in ('Base','Limitless','Élite','No sé')),
  acepta_compromiso boolean not null default false,
  estado text not null default 'nueva'
);

alter table public.aplicaciones enable row level security;

-- El público solo puede INSERTAR; nadie puede leer desde la web.
drop policy if exists "publico inserta aplicaciones" on public.aplicaciones;
create policy "publico inserta aplicaciones"
  on public.aplicaciones for insert
  to anon
  with check (acepta_compromiso = true and estado = 'nueva');
