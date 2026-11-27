-- VS Limitless · Promociones de la landing (Black Friday 2026)
alter table public.aplicaciones add column if not exists oferta text;
alter table public.aplicaciones drop constraint if exists aplicaciones_oferta_valida;
alter table public.aplicaciones add constraint aplicaciones_oferta_valida check (oferta is null or oferta in ('black_friday_25'));
insert into public.ajustes (clave, valor) values ('promo_bf_lugares', '5') on conflict (clave) do nothing;
-- El público solo lee las claves promo_* (lugares restantes); el resto de ajustes sigue privado
grant select on public.ajustes to anon;
drop policy if exists "publico lee promos" on public.ajustes;
create policy "publico lee promos" on public.ajustes for select to anon using (clave like 'promo\_%');
