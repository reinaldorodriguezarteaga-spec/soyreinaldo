-- =============================================================================
-- Picks especiales: pichichi y goleador final pasan a texto libre
-- =============================================================================
-- Cada quien escribe el nombre del jugador como quiera. A la hora de evaluar
-- (M4), el admin pone el nombre oficial y el sistema hace match
-- case/accent-insensitive (o el admin valida manualmente las dudosas).
-- =============================================================================

-- user_picks: cambiamos las FK a candidates por texto libre
alter table public.user_picks
  drop column if exists pichichi_candidate,
  drop column if exists final_scorer_candidate;

alter table public.user_picks
  add column if not exists pichichi_name text,
  add column if not exists final_scorer_name text;

-- tournament_results: idem
alter table public.tournament_results
  drop column if exists pichichi_candidate,
  drop column if exists final_scorers;

alter table public.tournament_results
  add column if not exists pichichi_name text,
  add column if not exists final_scorer_names text[];

-- Tabla de candidatos ya no hace falta
drop table if exists public.pichichi_candidates cascade;
