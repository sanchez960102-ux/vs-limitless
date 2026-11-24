-- VS Limitless · Tests de evaluación (carrera, fuerza, funcional, movilidad)
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null check (categoria in ('carrera','fuerza','funcional','movilidad')),
  unidad text not null check (unidad in ('tiempo','kg_reps','reps','cm','m','bpm')),
  mejor text not null default 'mayor' check (mejor in ('mayor','menor')),
  distancia int,
  calculo text,
  protocolo text not null default '',
  activo boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.items add column if not exists test_id uuid references public.tests(id) on delete set null;

create table if not exists public.resultados_test (
  id uuid primary key default gen_random_uuid(),
  miembro_id uuid not null references public.perfiles(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  item_id uuid references public.items(id) on delete set null,
  valor numeric not null,
  detalle text,
  nota text,
  fecha date not null default (now() at time zone 'America/Guatemala')::date,
  created_at timestamptz not null default now(),
  unique (item_id)
);
create index if not exists resultados_test_miembro on public.resultados_test (miembro_id, test_id, fecha);

alter table public.tests enable row level security;
alter table public.resultados_test enable row level security;
grant select, insert, update, delete on public.tests, public.resultados_test to authenticated;

drop policy if exists "coach total" on public.tests;
create policy "coach total" on public.tests for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "leen tests" on public.tests;
create policy "leen tests" on public.tests for select to authenticated using (true);

drop policy if exists "coach total" on public.resultados_test;
create policy "coach total" on public.resultados_test for all to authenticated using (public.es_coach()) with check (public.es_coach());
drop policy if exists "sus resultados" on public.resultados_test;
create policy "sus resultados" on public.resultados_test for all to authenticated
  using (miembro_id = auth.uid() and public.al_dia()) with check (miembro_id = auth.uid() and public.al_dia());

insert into public.tests (nombre, categoria, unidad, mejor, distancia, calculo, protocolo, orden)
select * from (values
  ('Test de Cooper (12 min)', 'carrera', 'm', 'mayor', null::int, 'cooper', 'Calienta 10 min trotando suave. Corre la mayor distancia posible en 12 minutos, de preferencia en pista o terreno plano. Anota los metros totales que marcó tu reloj o las vueltas × 400 m.', 1),
  ('1 km contrarreloj', 'carrera', 'tiempo', 'menor', 1000, 'ritmo', 'Calienta 10–15 min con 3 aceleraciones cortas. Corre 1 km al máximo ritmo que puedas sostener. Anota el tiempo total.', 2),
  ('3 km contrarreloj', 'carrera', 'tiempo', 'menor', 3000, 'ritmo', 'Calienta 15 min. Corre 3 km a ritmo de carrera, parejo de principio a fin. Anota el tiempo total.', 3),
  ('5 km contrarreloj', 'carrera', 'tiempo', 'menor', 5000, 'ritmo', 'Calienta 15 min. Corre 5 km al mejor ritmo que puedas sostener, en terreno plano. Anota el tiempo total.', 4),
  ('Frecuencia cardiaca en reposo', 'carrera', 'bpm', 'menor', null, null, 'Al despertar, antes de levantarte, mide tus pulsaciones durante 60 segundos (o con tu reloj). Haz el promedio de 3 días.', 5),
  ('Sentadilla · RM estimado', 'fuerza', 'kg_reps', 'mayor', null, '1rm', 'Calienta con 2–3 series progresivas. Elige un peso que puedas mover entre 3 y 8 repeticiones con buena técnica, sin llegar al fallo técnico. Anota el peso y las repeticiones.', 10),
  ('Peso muerto · RM estimado', 'fuerza', 'kg_reps', 'mayor', null, '1rm', 'Calienta progresivo. Peso para 3 a 8 repeticiones con espalda neutra en todas. Anota peso y repeticiones.', 11),
  ('Press de banca · RM estimado', 'fuerza', 'kg_reps', 'mayor', null, '1rm', 'Calienta progresivo, de preferencia con alguien que te asista. Peso para 3 a 8 repeticiones completas. Anota peso y repeticiones.', 12),
  ('Press militar · RM estimado', 'fuerza', 'kg_reps', 'mayor', null, '1rm', 'De pie, con barra o mancuernas. Peso para 3 a 8 repeticiones sin arquear la espalda. Anota peso y repeticiones (si son mancuernas, el peso de las dos).', 13),
  ('Dominadas máximas', 'fuerza', 'reps', 'mayor', null, null, 'Agarre prono, desde brazos extendidos hasta pasar la barbilla sobre la barra. Máximas repeticiones continuas sin balanceo.', 14),
  ('Flexiones máximas', 'fuerza', 'reps', 'mayor', null, null, 'Cuerpo en línea recta, pecho hasta un puño del suelo. Máximas repeticiones continuas sin perder la técnica.', 15),
  ('Plancha frontal máxima', 'funcional', 'tiempo', 'mayor', null, null, 'Apoyo en antebrazos, cuerpo alineado. Detén el tiempo cuando la cadera caiga o se eleve.', 20),
  ('Salto horizontal', 'funcional', 'cm', 'mayor', null, null, 'Pies a la anchura de cadera, salta lo más lejos posible con los dos pies y cae estable. Mide desde la línea de salida hasta el talón más cercano. Mejor de 3 intentos.', 21),
  ('Salto vertical', 'funcional', 'cm', 'mayor', null, null, 'Junto a una pared, marca tu alcance de pie. Salta con contramovimiento y marca el punto más alto. Anota la diferencia. Mejor de 3 intentos.', 22),
  ('Sentarse y levantarse en 30 s', 'funcional', 'reps', 'mayor', null, null, 'Silla de 43 cm contra la pared, brazos cruzados al pecho. Cuenta cuántas veces te levantas por completo en 30 segundos. Ideal para adultos mayores.', 23),
  ('Sentadilla en pared', 'funcional', 'tiempo', 'mayor', null, null, 'Espalda contra la pared, rodillas a 90°. Detén el tiempo cuando ya no puedas sostener la posición.', 24),
  ('Flexibilidad sentado (sit and reach)', 'movilidad', 'cm', 'mayor', null, null, 'Sentado con piernas extendidas y pies contra una caja. Lleva las manos hacia adelante sin rebotar. Anota los cm respecto a la punta de los pies (negativo si no llegas).', 30),
  ('Dorsiflexión de tobillo (rodilla a la pared)', 'movilidad', 'cm', 'mayor', null, null, 'En posición de zancada frente a la pared, lleva la rodilla a tocarla sin despegar el talón. Aleja el pie hasta el máximo que lo logres y mide la distancia del dedo gordo a la pared. Anota el peor lado.', 31)
) as v(nombre, categoria, unidad, mejor, distancia, calculo, protocolo, orden)
where not exists (select 1 from public.tests);
