-- =============================================================================
-- Crons de ingesta y caché, dentro de Supabase (pg_cron + pg_net + Vault)
-- =============================================================================
-- El tick que mantenía vivos los marcadores del Mundial salía de aquí, no de
-- un cron externo (el comentario de `/api/sports/ingest` dice cron-job.org;
-- es falso, ver `vault.secrets.ingest_cron_secret`, creado el 10-jun-2026).
-- Al acabar el Mundial se desprogramó y nadie lo volvió a poner: LaLiga
-- arrancó el 15-ago con 380 partidos en `lq_matches` y ninguno con marcador,
-- y `sports_cache` sin escribirse desde el 13-ago (cada visita a la portada
-- cayendo a llamar a API-Football en vivo, justo lo que el PR #57 evitaba).
--
-- Vercel en plan gratis solo permite crons diarios y la cuenta de GitHub
-- tiene Actions bloqueado, así que la casa es este sitio: el token nunca sale
-- del Vault y no depende de ningún servicio de terceros.
--
-- El token se lee por nombre; si algún día se rota, se cambia en el Vault
-- (Dashboard → Project Settings → Vault) y estos jobs lo cogen solos. Si el
-- secreto no existiera, el `from` no devuelve filas y sencillamente no se
-- hace la llamada.
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('ingesta-marcadores') where exists (
  select 1 from cron.job where jobname = 'ingesta-marcadores');
select cron.unschedule('cache-deportes') where exists (
  select 1 from cron.job where jobname = 'cache-deportes');

-- Marcadores en vivo: cada minuto. La ruta solo gasta cuota de API-Football
-- si hay partidos en juego (`lq_matches_pending_ingest`), así que los ticks
-- en vacío son gratis.
select cron.schedule(
  'ingesta-marcadores',
  '* * * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/sports/ingest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || s.decrypted_secret
      ),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);

-- Caché precalculada (tabla, calendario y próximos de las 9 competiciones):
-- cada 10 min. Son ~39 llamadas por vuelta, ~5.600/día sobre 75.000.
select cron.schedule(
  'cache-deportes',
  '*/10 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/refresh-sports-cache',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || s.decrypted_secret
      ),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
