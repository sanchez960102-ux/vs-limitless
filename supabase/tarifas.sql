-- VS Limitless · Tarifa pactada por miembro
-- Cada miembro guarda cuánto paga al mes, con qué etiqueta (precio fundador, promoción)
-- y, si entró con una oferta, cuánto paga su primer mes.

alter table public.perfiles     add column if not exists tarifa numeric(10,2);
alter table public.perfiles     add column if not exists tarifa_etiqueta text;
alter table public.perfiles     add column if not exists primer_mes numeric(10,2);
alter table public.perfiles     add column if not exists oferta text;
alter table public.invitaciones add column if not exists tarifa numeric(10,2);
alter table public.invitaciones add column if not exists tarifa_etiqueta text;
alter table public.invitaciones add column if not exists primer_mes numeric(10,2);
alter table public.invitaciones add column if not exists oferta text;

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
    insert into public.perfiles (id, correo, nombre, rol, plan, objetivo, tarifa, tarifa_etiqueta, primer_mes, oferta)
    values (new.id, new.email, inv.nombre, 'miembro', inv.plan, inv.objetivo, inv.tarifa, inv.tarifa_etiqueta, inv.primer_mes, inv.oferta)
    on conflict (id) do nothing;
    update public.invitaciones set usada = true where id = inv.id;
  else
    insert into public.perfiles (id, correo, rol) values (new.id, new.email, 'pendiente')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create or replace function public.activar_pendiente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.perfiles
     set rol = 'miembro', plan = new.plan, nombre = coalesce(nombre, new.nombre), objetivo = coalesce(objetivo, new.objetivo),
         tarifa = new.tarifa, tarifa_etiqueta = new.tarifa_etiqueta, primer_mes = new.primer_mes, oferta = new.oferta
   where lower(correo) = lower(new.correo) and rol = 'pendiente';
  if found then
    update public.invitaciones set usada = true where id = new.id;
  end if;
  return new;
end;
$$;
