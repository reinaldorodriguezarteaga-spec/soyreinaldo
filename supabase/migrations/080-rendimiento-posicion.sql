-- Rendimiento por posición (20-oct, pedido del dueño). Una fila por jugador
-- y partido con la posición en la que jugó (de su casilla en la alineación,
-- ver src/lib/rendimiento/posiciones.ts) y lo que hizo. La rellena el cron
-- `rendimiento` desde el archivo de la API (partidos terminados: gratis) y,
-- poco a poco, los partidos de esta temporada que falten.
create table if not exists public.apariciones_posicion (
  fixture_id int not null,
  player_id int not null,
  team_id int not null,
  league_id int,
  season int,
  fecha timestamptz,
  rol text not null,
  minutos int not null,
  goles int not null default 0,
  asistencias int not null default 0,
  nota numeric(4, 2),
  primary key (fixture_id, player_id)
);
create index if not exists apariciones_jugador on public.apariciones_posicion (player_id, season);

-- Partidos ya mirados (con o sin apariciones), para no repetirlos.
create table if not exists public.rendimiento_procesados (
  fixture_id int primary key,
  apariciones int not null default 0,
  procesado_at timestamptz not null default now()
);

alter table public.apariciones_posicion enable row level security;
alter table public.rendimiento_procesados enable row level security;
drop policy if exists apariciones_ver on public.apariciones_posicion;
create policy apariciones_ver on public.apariciones_posicion for select to anon, authenticated using (true);
-- rendimiento_procesados: sin políticas (solo el cron, con service role).

-- Índice parcial: solo las alineaciones terminadas (~2.400 de 66.000 filas);
-- sin él, la consulta de abajo recorría el archivo entero (9,5 s).
create index if not exists apif_archivo_alineaciones on public.apif_archivo (url)
  where final and url like 'https://v3.football.api-sports.io/fixtures/lineups?fixture=%';

-- Partidos terminados que ya están en el archivo (alineación y jugadores) y
-- aún no se han procesado: el trabajo gratis del cron.
create or replace function public.rendimiento_pendientes(p_limite int)
returns table(fixture_id int)
language sql stable security definer set search_path = public as $$
  select distinct substring(a.url from 'fixture=([0-9]+)')::int
  from public.apif_archivo a
  where a.url like 'https://v3.football.api-sports.io/fixtures/lineups?fixture=%'
    and a.final
    and exists (
      select 1 from public.apif_archivo b
      where b.url = replace(a.url, '/fixtures/lineups?', '/fixtures/players?') and b.final
    )
    and not exists (
      select 1 from public.rendimiento_procesados p
      where p.fixture_id = substring(a.url from 'fixture=([0-9]+)')::int
    )
  limit greatest(1, least(p_limite, 200));
$$;
revoke all on function public.rendimiento_pendientes(int) from public, anon, authenticated;
grant execute on function public.rendimiento_pendientes(int) to service_role;

-- Cada hora (a y 25, lejos de los demás crons).
select cron.unschedule('rendimiento') where exists (select 1 from cron.job where jobname = 'rendimiento');
select cron.schedule(
  'rendimiento',
  '25 * * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/rendimiento',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
