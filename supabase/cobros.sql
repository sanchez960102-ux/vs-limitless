-- VS Limitless · Control de pagos de miembros
-- El coach registra cada pago; la fecha "pagado_hasta" decide qué ve el miembro.
-- Pasados los días de gracia, la base de datos deja de entregar el plan (no solo la app).

alter table public.perfiles add column if not exists pagado_hasta date;

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  fecha date not null default (now() at time zone 'America/Guatemala')::date,
  monto numeric(10,2),
  meses int not null default 1 check (meses between 1 and 12),
  metodo text,
  nota text,
  cubre_hasta date not null,
  created_at timestamptz not null default now()
);
create index if not exists pagos_miembro on public.pagos (miembro_id, fecha desc);
alter table public.pagos enable row level security;

insert into public.ajustes (clave, valor) values
  ('cobro_instrucciones', 'Escríbeme por WhatsApp y te comparto los datos para pagar.'),
  ('cobro_whatsapp', ''),
  ('cobro_gracia', '5')
on conflict (clave) do nothing;

-- Hoy en Guatemala
create or replace function public.hoy_gt() returns date language sql stable
as $$ select (now() at time zone 'America/Guatemala')::date $$;

-- ¿El usuario actual puede ver su plan?
create or replace function public.al_dia() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.rol <> 'miembro'
        or p.pagado_hasta is null
        or p.pagado_hasta + coalesce((select valor::int from public.ajustes where clave = 'cobro_gracia'), 5) >= public.hoy_gt()
    from public.perfiles p where p.id = auth.uid()), false)
$$;
revoke execute on function public.al_dia() from public, anon;
grant execute on function public.al_dia() to authenticated;

-- Registrar un pago: suma meses desde el vencimiento actual o desde hoy si ya venció
create or replace function public.registrar_pago(p_miembro uuid, p_meses int, p_monto numeric, p_metodo text, p_nota text)
returns date language plpgsql security definer set search_path = public as $$
declare base date; nueva date;
begin
  if not public.es_coach() then raise exception 'Solo el coach registra pagos'; end if;
  select greatest(coalesce(pagado_hasta, hoy_gt()), hoy_gt()) into base from perfiles where id = p_miembro;
  if base is null then raise exception 'Miembro no encontrado'; end if;
  nueva := (base + make_interval(months => p_meses))::date;
  insert into pagos (miembro_id, monto, meses, metodo, nota, cubre_hasta) values (p_miembro, p_monto, p_meses, p_metodo, p_nota, nueva);
  update perfiles set pagado_hasta = nueva where id = p_miembro;
  return nueva;
end $$;
revoke execute on function public.registrar_pago(uuid,int,numeric,text,text) from public, anon;
grant execute on function public.registrar_pago(uuid,int,numeric,text,text) to authenticated;

-- Permisos
grant select, insert, update, delete on public.pagos to authenticated;
grant select, insert, update on public.ajustes to authenticated;

drop policy if exists "coach total" on public.pagos;
create policy "coach total" on public.pagos for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "ve sus pagos" on public.pagos;
create policy "ve sus pagos" on public.pagos for select to authenticated using (miembro_id = auth.uid());

drop policy if exists "coach ajustes" on public.ajustes;
create policy "coach ajustes" on public.ajustes for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "lee ajustes de cobro" on public.ajustes;
create policy "lee ajustes de cobro" on public.ajustes for select to authenticated using (clave like 'cobro\_%');

-- El plan solo se entrega si el miembro está al día (o dentro de la gracia)
drop policy if exists "ve sus bloques" on public.bloques;
create policy "ve sus bloques" on public.bloques for select to authenticated using (miembro_id = auth.uid() and public.al_dia());
drop policy if exists "ve sus sesiones" on public.sesiones;
create policy "ve sus sesiones" on public.sesiones for select to authenticated using (miembro_id = auth.uid() and public.al_dia());
drop policy if exists "ve sus items" on public.items;
create policy "ve sus items" on public.items for select to authenticated
  using (public.al_dia() and exists (select 1 from public.sesiones s where s.id = sesion_id and s.miembro_id = auth.uid()));
drop policy if exists "sus registros" on public.registros;
create policy "sus registros" on public.registros for all to authenticated
  using (miembro_id = auth.uid() and public.al_dia()) with check (miembro_id = auth.uid() and public.al_dia());

-- Baja y eliminación ---------------------------------------------------------------
-- Un miembro pausado o dado de baja tampoco recibe su plan.
create or replace function public.al_dia() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.rol <> 'miembro'
        or (p.estado = 'activo' and (
              p.pagado_hasta is null
              or p.pagado_hasta + coalesce((select valor::int from public.ajustes where clave = 'cobro_gracia'), 5) >= public.hoy_gt()))
    from public.perfiles p where p.id = auth.uid()), false)
$$;

-- Elimina la cuenta y todo su historial (en cascada). Solo el coach.
create or replace function public.eliminar_miembro(p_miembro uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_correo text; v_rol text;
begin
  if not public.es_coach() then raise exception 'Solo el coach elimina miembros'; end if;
  select correo, rol into v_correo, v_rol from public.perfiles where id = p_miembro;
  if v_correo is null then raise exception 'Miembro no encontrado'; end if;
  if v_rol = 'coach' then raise exception 'No se puede eliminar al coach'; end if;
  delete from public.invitaciones where lower(correo) = lower(v_correo);
  delete from auth.users where id = p_miembro;
end $$;
revoke execute on function public.eliminar_miembro(uuid) from public, anon;
grant execute on function public.eliminar_miembro(uuid) to authenticated;
