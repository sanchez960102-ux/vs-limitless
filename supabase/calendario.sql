-- VS Limitless · Calendario de promociones
-- Cada promoción tiene su propio código en la aplicación (oferta) y, si pide un dato extra
-- (pareja, para quién es el regalo), se guarda en detalle_oferta.
alter table public.aplicaciones drop constraint if exists aplicaciones_oferta_valida;
alter table public.aplicaciones add constraint aplicaciones_oferta_valida check (oferta is null or oferta ~ '^[a-z0-9_]{3,40}$');
alter table public.aplicaciones add column if not exists detalle_oferta text;
alter table public.aplicaciones drop constraint if exists aplicaciones_detalle_oferta_check;
alter table public.aplicaciones add constraint aplicaciones_detalle_oferta_check check (detalle_oferta is null or char_length(detalle_oferta) <= 300);
