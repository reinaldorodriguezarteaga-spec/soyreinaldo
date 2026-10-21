-- Menos Disk IO (21-oct, aviso de Supabase: «Your project is depleting its
-- Disk IO Budget»). Lo que más escribía el disco:
--  1. sports_cache: el cron cache-deportes reescribe cada 10 min ~450 filas,
--     algunas de cientos de KB (calendarios de temporada), aunque no cambien.
--  2. apif_archivo: cada respuesta de la API se reescribía entera aunque
--     fuera idéntica a la guardada.
--  3. cron.job_run_details: el directo cada 15 s deja ~5.800 filas al día y
--     nadie las borraba (179.000 filas, 92 MB).
--
-- (1) y (2): una firma (md5 del JSON). Si no cambia, solo se toca la fecha:
-- Postgres reaprovecha el JSON ya guardado (TOAST) y no lo vuelve a escribir.
-- Las filas existentes sin firma la estrenan en su próxima escritura (sin
-- rellenarlas ahora, que sería reescribir 150 MB de golpe).

alter table public.sports_cache add column if not exists firma text;
alter table public.apif_archivo add column if not exists firma text;

create or replace function public.guardar_cache(p_key text, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  f text := md5(p_data::text);
begin
  update public.sports_cache set updated_at = now()
  where cache_key = p_key and firma = f;
  if found then return; end if;
  insert into public.sports_cache (cache_key, data, updated_at, firma)
  values (p_key, p_data, now(), f)
  on conflict (cache_key) do update
    set data = excluded.data, updated_at = excluded.updated_at, firma = excluded.firma;
end $$;

create or replace function public.guardar_archivo(p_url text, p_respuesta jsonb, p_final boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  f text := md5(p_respuesta::text);
begin
  update public.apif_archivo set actualizado = now(), final = p_final
  where url = p_url and firma = f;
  if found then return; end if;
  insert into public.apif_archivo (url, respuesta, final, actualizado, firma)
  values (p_url, p_respuesta, p_final, now(), f)
  on conflict (url) do update
    set respuesta = excluded.respuesta, final = excluded.final,
        actualizado = excluded.actualizado, firma = excluded.firma;
end $$;

revoke all on function public.guardar_cache(text, jsonb) from public, anon, authenticated;
revoke all on function public.guardar_archivo(text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.guardar_cache(text, jsonb) to service_role;
grant execute on function public.guardar_archivo(text, jsonb, boolean) to service_role;

-- (3) Historial de pg_cron: tres días bastan para mirar fallos recientes.
delete from cron.job_run_details where end_time < now() - interval '3 days';
select cron.unschedule('limpiar-historial-cron') where exists (select 1 from cron.job where jobname = 'limpiar-historial-cron');
select cron.schedule(
  'limpiar-historial-cron',
  '40 4 * * *',
  $job$ delete from cron.job_run_details where end_time < now() - interval '3 days' $job$
);
