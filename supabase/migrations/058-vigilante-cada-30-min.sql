-- 058 · Vigilante cada 30 min y sin repetir el mismo aviso (13-oct-2026).
--
-- El 13-oct un robot con disfraz nuevo gastó 52.000 llamadas de API-Football
-- en 6 horas; con el vigilante cada 3 h el aviso llegaba con la cuota ya
-- casi agotada. Cada 30 min avisa a tiempo. Para no mandar el mismo correo
-- 48 veces al día, guarda la "firma" del último aviso y no lo repite en 6 h
-- salvo que cambien los problemas.

create table if not exists public.vigilante_avisos (
  id int primary key default 1 check (id = 1),
  firma text not null,
  enviado_at timestamptz not null default now()
);
alter table public.vigilante_avisos enable row level security;
-- Sin políticas: solo la service role (el propio vigilante) la toca.

select cron.unschedule('vigilante') where exists (
  select 1 from cron.job where jobname = 'vigilante');
select cron.schedule(
  'vigilante',
  '11,41 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/vigilante',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
