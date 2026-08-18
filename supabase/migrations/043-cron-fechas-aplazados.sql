-- =============================================================================
-- Cron: re-sincronizar las fechas de los partidos aplazados
-- =============================================================================
-- La ingesta en vivo elige a quién pedir marcador con NUESTRO `kickoff_at`
-- (ventana de −4h a +5min). Cuando LaLiga aplaza un partido, API-Football le
-- cambia la fecha pero la nuestra se queda vieja, así que el día que se juega
-- de verdad la ingesta ni lo mira y se queda sin marcador para siempre.
-- Le pasó a Celta-Osasuna de la jornada 1 (movido del 16 al 27 de agosto).
--
-- Cada 6 horas basta y sobra: los aplazamientos se anuncian con días de
-- antelación, y son 4 llamadas a API-Football al día.
-- =============================================================================

select cron.unschedule('fechas-lq') where exists (
  select 1 from cron.job where jobname = 'fechas-lq');

select cron.schedule(
  'fechas-lq',
  '17 */6 * * *',   -- a y 17, para no coincidir con los otros jobs
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/refresh-lq-fixtures',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || s.decrypted_secret
      ),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
