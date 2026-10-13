-- 059 · Refresco de fichas tras cada partido (13-oct-2026).
--
-- Cuando un partido de nuestras competiciones termina, el cron
-- `refresco-post-partido` pone al día en el archivo las fichas de los dos
-- equipos y de sus jugadores (ver src/app/api/cron/refresco-post-partido).
-- Esta tabla apunta qué partidos ya se refrescaron para no repetirlos.

create table if not exists public.refrescos_post_partido (
  fixture_id int primary key,
  competition text not null,
  llamadas int not null default 0,
  hecho_at timestamptz not null default now()
);
alter table public.refrescos_post_partido enable row level security;
-- Sin políticas: solo la service role (el cron) la toca.

select cron.unschedule('refresco-post-partido') where exists (
  select 1 from cron.job where jobname = 'refresco-post-partido');
select cron.schedule(
  'refresco-post-partido',
  '7-59/10 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/refresco-post-partido',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 115000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
