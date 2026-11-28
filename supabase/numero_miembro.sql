-- VS Limitless · Número de miembro
-- Cada miembro recibe un número consecutivo al entrar al equipo. Se queda con él aunque se dé de baja.
alter table public.perfiles add column if not exists numero integer unique;

with orden as (
  select id, row_number() over (order by created_at) as n from public.perfiles where rol = 'miembro' and numero is null
)
update public.perfiles p set numero = orden.n + coalesce((select max(numero) from public.perfiles), 0)
from orden where p.id = orden.id;

create or replace function public.asignar_numero()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rol = 'miembro' and new.numero is null then
    perform pg_advisory_xact_lock(hashtext('vsl_numero_miembro'));
    select coalesce(max(numero), 0) + 1 into new.numero from public.perfiles;
  end if;
  return new;
end;
$$;

drop trigger if exists numero_miembro on public.perfiles;
create trigger numero_miembro before insert or update of rol on public.perfiles
for each row execute function public.asignar_numero();
