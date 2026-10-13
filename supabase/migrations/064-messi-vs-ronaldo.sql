-- 064 · Messi vs Ronaldo (13-oct-2026, pedido del dueño).
--
-- Totales de carrera (partidos oficiales, club y selección) de una fuente que
-- lleva a los dos con los mismos criterios (messixronaldo.com, actualizada el
-- 12-oct-2026; el gol de Cristiano ante el Neftchi de ese día ya incluido),
-- más cada partido que juegan desde el 13-oct, que el cron `goats` lee del
-- API (/fixtures/players) y apunta en goat_partidos.

create table if not exists public.goat_base (
  jugador text primary key,
  api_id int not null,
  partidos int not null,
  goles int not null,
  asistencias int not null,
  desde date not null,
  fuente text not null
);

create table if not exists public.goat_partidos (
  fixture_id int not null,
  jugador text not null references public.goat_base (jugador),
  fecha timestamptz not null,
  minutos int not null default 0,
  goles int not null default 0,
  asistencias int not null default 0,
  primary key (fixture_id, jugador)
);

alter table public.goat_base enable row level security;
alter table public.goat_partidos enable row level security;
drop policy if exists goat_base_select on public.goat_base;
create policy goat_base_select on public.goat_base for select to anon, authenticated using (true);
drop policy if exists goat_partidos_select on public.goat_partidos;
create policy goat_partidos_select on public.goat_partidos for select to anon, authenticated using (true);

insert into public.goat_base (jugador, api_id, partidos, goles, asistencias, desde, fuente) values
  ('messi', 154, 1179, 934, 465, '2026-10-13', 'messixronaldo.com (12-oct-2026)'),
  ('ronaldo', 874, 1336, 981, 307, '2026-10-13', 'messixronaldo.com (12-oct-2026)')
on conflict (jugador) do nothing;

-- Cada 2 h: mira los últimos partidos de sus equipos y apunta los nuevos.
select cron.unschedule('goats') where exists (select 1 from cron.job where jobname = 'goats');
select cron.schedule(
  'goats',
  '23 */2 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/goats',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
