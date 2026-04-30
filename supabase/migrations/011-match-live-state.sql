-- =============================================================================
-- Live state de partidos: columnas para ingesta automática desde API-Football
-- =============================================================================
-- El cron `/api/sports/ingest` poblará estas columnas durante el Mundial:
--   api_football_fixture_id  → se setea una vez en el backfill (script)
--   status                   → 'NS','1H','HT','2H','ET','BT','P','FT','AET','PEN','PST','CANC',...
--   live_minute              → minuto actual si live
--   last_polled_at           → última vez que el cron miró este partido
-- `score_home/away/finished` ya existen y se siguen rellenando igual.
-- =============================================================================

alter table public.matches
  add column if not exists api_football_fixture_id integer,
  add column if not exists status text,
  add column if not exists live_minute smallint,
  add column if not exists last_polled_at timestamptz;

create index if not exists idx_matches_api_fixture
  on public.matches(api_football_fixture_id)
  where api_football_fixture_id is not null;

-- Identifica el conjunto candidato de partidos para el ingest:
--   - kickoff entre [now-4h, now+30min] → live o a punto de empezar
--   - O kickoff ya pasó y aún no está finished → recoger resultados perdidos
-- Solo los que tienen api_football_fixture_id (los demás se ignoran).
create or replace function public.matches_pending_ingest()
returns table (id integer, api_football_fixture_id integer)
language sql
stable
security definer
set search_path = public
as $$
  select id, api_football_fixture_id
  from public.matches
  where api_football_fixture_id is not null
    and (
      (kickoff_at between now() - interval '4 hours'
                     and now() + interval '30 minutes')
      or (kickoff_at < now() and finished = false)
    )
$$;

revoke all on function public.matches_pending_ingest() from public, anon, authenticated;
