-- VS Limitless · App de miembros
-- Ejecutar UNA vez en Supabase → SQL Editor → New query → Run,
-- después de supabase/schema.sql (la tabla de aplicaciones).

-- 1. Ajustes: quién es el coach ------------------------------------------------
create table if not exists public.ajustes (
  clave text primary key,
  valor text not null
);
insert into public.ajustes (clave, valor)
values ('coach_email', 'laf.victor.sanchez@gmail.com')
on conflict (clave) do update set valor = excluded.valor;

-- 2. Perfiles e invitaciones ----------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  correo text not null,
  nombre text,
  rol text not null default 'pendiente' check (rol in ('coach','miembro','pendiente')),
  plan text check (plan in ('Base','Limitless','Élite')),
  estado text not null default 'activo' check (estado in ('activo','pausado','baja')),
  objetivo text,
  created_at timestamptz not null default now()
);

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  correo text not null unique,
  nombre text,
  plan text not null check (plan in ('Base','Limitless','Élite')),
  objetivo text,
  aplicacion_id uuid references public.aplicaciones(id) on delete set null,
  usada boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.es_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'coach');
$$;

-- Alta automática: coach, miembro invitado o pendiente
create or replace function public.alta_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inv public.invitaciones;
  coach text;
begin
  select valor into coach from public.ajustes where clave = 'coach_email';
  if lower(new.email) = lower(coach) then
    insert into public.perfiles (id, correo, nombre, rol) values (new.id, new.email, 'Vic Sánchez', 'coach')
    on conflict (id) do nothing;
    return new;
  end if;
  select * into inv from public.invitaciones where lower(correo) = lower(new.email) and not usada limit 1;
  if found then
    insert into public.perfiles (id, correo, nombre, rol, plan, objetivo)
    values (new.id, new.email, inv.nombre, 'miembro', inv.plan, inv.objetivo)
    on conflict (id) do nothing;
    update public.invitaciones set usada = true where id = inv.id;
  else
    insert into public.perfiles (id, correo, rol) values (new.id, new.email, 'pendiente')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.alta_usuario();

-- Si alguien entró antes de ser invitado, la invitación lo activa
create or replace function public.activar_pendiente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles
     set rol = 'miembro', plan = new.plan, nombre = coalesce(nombre, new.nombre), objetivo = coalesce(objetivo, new.objetivo)
   where lower(correo) = lower(new.correo) and rol = 'pendiente';
  if found then
    update public.invitaciones set usada = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists al_invitar on public.invitaciones;
create trigger al_invitar after insert on public.invitaciones
  for each row execute function public.activar_pendiente();

-- 3. Plan de entrenamiento -----------------------------------------------------
create table if not exists public.bloques (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  nombre text not null,
  fecha_inicio date not null,
  semanas int not null default 4 check (semanas between 1 and 24),
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sesiones (
  id uuid primary key default gen_random_uuid(),
  bloque_id uuid not null references public.bloques(id) on delete cascade,
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  semana int not null check (semana between 1 and 24),
  dia int not null check (dia between 1 and 7),
  titulo text not null,
  tipo text not null default 'fuerza' check (tipo in ('fuerza','carrera','bici','movilidad','mixta')),
  notas text,
  orden int not null default 0
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  ejercicio text not null,
  series text,
  reps text,
  carga text,
  ritmo text,
  descanso text,
  nota text,
  video_url text,
  orden int not null default 0
);

-- 4. Lo que registra el miembro ------------------------------------------------
create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references public.sesiones(id) on delete cascade,
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  completada boolean not null default true,
  rpe int check (rpe between 1 and 10),
  nota text,
  resultados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (sesion_id)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  peso numeric(5,1),
  sueno int check (sueno between 1 and 5),
  energia int check (energia between 1 and 5),
  sesiones_cumplidas int,
  comentario text,
  respuesta text,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  ejercicio text not null,
  ruta text not null,
  nota text,
  comentario text,
  estado text not null default 'pendiente' check (estado in ('pendiente','revisado')),
  created_at timestamptz not null default now()
);

-- 5. Seguridad por filas ---------------------------------------------------------
alter table public.ajustes enable row level security;
alter table public.perfiles enable row level security;
alter table public.invitaciones enable row level security;
alter table public.bloques enable row level security;
alter table public.sesiones enable row level security;
alter table public.items enable row level security;
alter table public.registros enable row level security;
alter table public.checkins enable row level security;
alter table public.videos enable row level security;

-- El coach puede todo; el miembro solo lo suyo
do $$
declare t text;
begin
  foreach t in array array['perfiles','invitaciones','bloques','sesiones','items','registros','checkins','videos'] loop
    execute format('drop policy if exists "coach total" on public.%I', t);
    execute format('create policy "coach total" on public.%I for all to authenticated using (public.es_coach()) with check (public.es_coach())', t);
  end loop;
end $$;

drop policy if exists "ve su perfil" on public.perfiles;
create policy "ve su perfil" on public.perfiles for select to authenticated using (id = auth.uid());

drop policy if exists "ve sus bloques" on public.bloques;
create policy "ve sus bloques" on public.bloques for select to authenticated using (miembro_id = auth.uid());

drop policy if exists "ve sus sesiones" on public.sesiones;
create policy "ve sus sesiones" on public.sesiones for select to authenticated using (miembro_id = auth.uid());

drop policy if exists "ve sus items" on public.items;
create policy "ve sus items" on public.items for select to authenticated
  using (exists (select 1 from public.sesiones s where s.id = sesion_id and s.miembro_id = auth.uid()));

drop policy if exists "sus registros" on public.registros;
create policy "sus registros" on public.registros for all to authenticated
  using (miembro_id = auth.uid()) with check (miembro_id = auth.uid());

drop policy if exists "ve sus checkins" on public.checkins;
create policy "ve sus checkins" on public.checkins for select to authenticated using (miembro_id = auth.uid());
drop policy if exists "crea sus checkins" on public.checkins;
create policy "crea sus checkins" on public.checkins for insert to authenticated
  with check (miembro_id = auth.uid() and respuesta is null);

drop policy if exists "ve sus videos" on public.videos;
create policy "ve sus videos" on public.videos for select to authenticated using (miembro_id = auth.uid());
drop policy if exists "sube sus videos" on public.videos;
create policy "sube sus videos" on public.videos for insert to authenticated
  with check (miembro_id = auth.uid() and estado = 'pendiente' and comentario is null);

-- El coach lee y gestiona las aplicaciones de la landing
drop policy if exists "coach lee aplicaciones" on public.aplicaciones;
create policy "coach lee aplicaciones" on public.aplicaciones for select to authenticated using (public.es_coach());
drop policy if exists "coach actualiza aplicaciones" on public.aplicaciones;
create policy "coach actualiza aplicaciones" on public.aplicaciones for update to authenticated using (public.es_coach());

-- 6. Videos de técnica (almacenamiento privado, 50 MB por archivo) ---------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tecnica', 'tecnica', false, 52428800, array['video/mp4','video/quicktime','video/webm','video/3gpp'])
on conflict (id) do nothing;

drop policy if exists "miembro sube su video" on storage.objects;
create policy "miembro sube su video" on storage.objects for insert to authenticated
  with check (bucket_id = 'tecnica' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "ve sus videos o coach" on storage.objects;
create policy "ve sus videos o coach" on storage.objects for select to authenticated
  using (bucket_id = 'tecnica' and ((storage.foldername(name))[1] = auth.uid()::text or public.es_coach()));

drop policy if exists "coach borra videos" on storage.objects;
create policy "coach borra videos" on storage.objects for delete to authenticated
  using (bucket_id = 'tecnica' and public.es_coach());

-- Índices
create index if not exists sesiones_bloque_semana on public.sesiones (bloque_id, semana, dia);
create index if not exists registros_miembro on public.registros (miembro_id, created_at desc);
create index if not exists checkins_miembro on public.checkins (miembro_id, created_at desc);
create index if not exists videos_estado on public.videos (estado, created_at desc);
