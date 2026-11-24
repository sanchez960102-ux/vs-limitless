-- VS Limitless · Refuerzo de permisos por plan (espejo de shared/permisos.js)
create or replace function public.plan_permite(funcion text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case funcion
      when 'tecnica_video' then p.plan in ('Limitless', 'Élite')
      when 'videollamada'  then p.plan = 'Élite'
      else true end
    from public.perfiles p where p.id = auth.uid()), false)
$$;
revoke execute on function public.plan_permite(text) from public, anon;
grant execute on function public.plan_permite(text) to authenticated;

-- Videos de técnica: solo Limitless y Élite, y al día con el pago
drop policy if exists "sube sus videos" on public.videos;
create policy "sube sus videos" on public.videos for insert to authenticated
  with check (miembro_id = auth.uid() and estado = 'pendiente' and comentario is null
              and public.plan_permite('tecnica_video') and public.al_dia());
drop policy if exists "miembro sube su video" on storage.objects;
create policy "miembro sube su video" on storage.objects for insert to authenticated
  with check (bucket_id = 'tecnica' and (storage.foldername(name))[1] = auth.uid()::text
              and public.plan_permite('tecnica_video') and public.al_dia());
