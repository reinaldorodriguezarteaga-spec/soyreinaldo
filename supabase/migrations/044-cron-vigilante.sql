-- =============================================================================
-- Vigilante de los crons
-- =============================================================================
-- Un cron que deja de correr no hace ruido: simplemente no pasa nada. Así
-- estuvo la ingesta días muerta en agosto sin que nadie se enterara, con
-- LaLiga ya empezada y 380 partidos sin marcador.
--
-- Este job comprueba cada 6 horas que la caché se refresca, que no se están
-- quedando partidos sin marcador y que los otros tres crons siguen
-- programados. Solo manda correo si algo falla.
-- =============================================================================

-- El vigilante necesita leer qué jobs hay programados, y `cron.job` no es
-- accesible desde la API. Función acotada: solo devuelve los nombres.
create or replace function public.cron_jobs_activos()
returns table(jobname text)
language sql
stable
security definer
set search_path = cron, public
as $$
  select j.jobname::text from cron.job j where j.active;
$$;

revoke all on function public.cron_jobs_activos() from public;
grant execute on function public.cron_jobs_activos() to service_role;

select cron.unschedule('vigilante') where exists (
  select 1 from cron.job where jobname = 'vigilante');

select cron.schedule(
  'vigilante',
  '41 */6 * * *',   -- a y 41, lejos de los otros jobs
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/vigilante',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || s.decrypted_secret
      ),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
