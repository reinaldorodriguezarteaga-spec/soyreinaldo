-- =============================================================================
-- QUINIELA MUNDIAL 2026 — Schema, RLS y helpers
-- =============================================================================
-- Cómo correrlo:
--   1) Supabase Dashboard → SQL Editor → New query
--   2) Pega este archivo entero
--   3) Run
--
-- Es idempotente: puedes correrlo varias veces sin romper nada.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. ADMIN FLAG (extiende profiles)
-- -----------------------------------------------------------------------------
-- Para que TÚ (Reinaldo) puedas gestionar ligas y meter resultados sin RLS
-- bloqueándote. Después del CREATE corre:
--   update public.profiles set is_admin = true where id = (
--     select id from auth.users where email = 'TU_EMAIL_AQUI'
--   );

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;


-- -----------------------------------------------------------------------------
-- 2. LIGAS (familiar / amigos / comunidad / ...)
-- -----------------------------------------------------------------------------

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Normaliza códigos a mayúsculas siempre (case-insensitive matching)
create or replace function public.normalize_league_code()
returns trigger language plpgsql as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;
drop trigger if exists trg_normalize_league_code on public.leagues;
create trigger trg_normalize_league_code
  before insert or update of code on public.leagues
  for each row execute function public.normalize_league_code();

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index if not exists idx_league_members_user on public.league_members(user_id);


-- -----------------------------------------------------------------------------
-- 3. EQUIPOS (48 selecciones)
-- -----------------------------------------------------------------------------
-- id es el código FIFA de 3 letras (ESP, BRA, ARG, MEX, USA, CAN...).
-- group_letter A..L (12 grupos).

create table if not exists public.teams (
  id text primary key check (id ~ '^[A-Z]{3}$'),
  name text not null,
  group_letter text check (group_letter is null or group_letter ~ '^[A-L]$'),
  flag_emoji text,
  created_at timestamptz not null default now()
);

create index if not exists idx_teams_group on public.teams(group_letter);


-- -----------------------------------------------------------------------------
-- 4. PARTIDOS (104 partidos)
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_phase') then
    create type public.match_phase as enum (
      'group_md1', 'group_md2', 'group_md3',
      'r32', 'r16', 'qf', 'sf', 'third_place', 'final'
    );
  end if;
end$$;

create table if not exists public.matches (
  id integer primary key,            -- número oficial FIFA (1..104)
  phase public.match_phase not null,
  group_letter text check (group_letter is null or group_letter ~ '^[A-L]$'),
  team_home text references public.teams(id) on delete set null,
  team_away text references public.teams(id) on delete set null,
  team_home_placeholder text,        -- "1A", "Winner of M85", etc.
  team_away_placeholder text,
  kickoff_at timestamptz not null,
  venue text,
  city text,
  score_home smallint check (score_home is null or score_home >= 0),
  score_away smallint check (score_away is null or score_away >= 0),
  finished boolean not null default false
);

create index if not exists idx_matches_kickoff on public.matches(kickoff_at);
create index if not exists idx_matches_phase on public.matches(phase);


-- -----------------------------------------------------------------------------
-- 5. PRONÓSTICOS (1 set por usuario, no por liga)
-- -----------------------------------------------------------------------------

create table if not exists public.predictions (
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id integer not null references public.matches(id) on delete cascade,
  score_home smallint not null check (score_home >= 0),
  score_away smallint not null check (score_away >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, match_id)
);

create index if not exists idx_predictions_match on public.predictions(match_id);


-- -----------------------------------------------------------------------------
-- 6. CANDIDATOS A PICHICHI (lista cerrada de jugadores)
-- -----------------------------------------------------------------------------

create table if not exists public.pichichi_candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id text references public.teams(id) on delete set null,
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_pichichi_active on public.pichichi_candidates(active);


-- -----------------------------------------------------------------------------
-- 7. PICKS ESPECIALES (campeón + subcampeón + pichichi + final + hat-tricks)
-- -----------------------------------------------------------------------------

create table if not exists public.user_picks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  champion_team text references public.teams(id) on delete set null,
  runner_up_team text references public.teams(id) on delete set null,
  pichichi_candidate uuid references public.pichichi_candidates(id) on delete set null,
  pichichi_predicted_goals smallint check (pichichi_predicted_goals is null or pichichi_predicted_goals >= 0),
  final_scorer_candidate uuid references public.pichichi_candidates(id) on delete set null,
  hat_tricks_count smallint check (hat_tricks_count is null or hat_tricks_count >= 0),
  updated_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 8. RESULTADOS OFICIALES DEL TORNEO (fila única, la rellenas al final)
-- -----------------------------------------------------------------------------

create table if not exists public.tournament_results (
  id smallint primary key default 1 check (id = 1),
  champion_team text references public.teams(id),
  runner_up_team text references public.teams(id),
  pichichi_candidate uuid references public.pichichi_candidates(id),
  pichichi_actual_goals smallint,
  final_scorers uuid[],              -- jugadores que marcaron en la final
  hat_tricks_count smallint,
  updated_at timestamptz not null default now()
);

-- Asegura que existe la fila única
insert into public.tournament_results (id)
values (1)
on conflict (id) do nothing;


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table public.leagues               enable row level security;
alter table public.league_members        enable row level security;
alter table public.teams                 enable row level security;
alter table public.matches               enable row level security;
alter table public.predictions           enable row level security;
alter table public.pichichi_candidates   enable row level security;
alter table public.user_picks            enable row level security;
alter table public.tournament_results    enable row level security;


-- LEAGUES: cualquiera autenticado ve la lista (necesario para join). Solo
-- admin puede crear/editar/borrar.
drop policy if exists "leagues_select_authenticated"   on public.leagues;
drop policy if exists "leagues_admin_write"            on public.leagues;
create policy "leagues_select_authenticated"
  on public.leagues for select
  to authenticated using (true);
create policy "leagues_admin_write"
  on public.leagues for all
  to authenticated using (public.is_admin()) with check (public.is_admin());


-- LEAGUE_MEMBERS: ves miembros de TUS ligas. Te puedes unir tú solo (insert
-- propio). Te puedes ir tú solo. Admin puede todo.
drop policy if exists "members_select_own_leagues"   on public.league_members;
drop policy if exists "members_insert_self"          on public.league_members;
drop policy if exists "members_delete_self_or_admin" on public.league_members;
create policy "members_select_own_leagues"
  on public.league_members for select
  to authenticated using (
    public.is_admin()
    or league_id in (
      select league_id from public.league_members where user_id = auth.uid()
    )
  );
create policy "members_insert_self"
  on public.league_members for insert
  to authenticated with check (user_id = auth.uid());
create policy "members_delete_self_or_admin"
  on public.league_members for delete
  to authenticated using (user_id = auth.uid() or public.is_admin());


-- TEAMS, MATCHES, PICHICHI_CANDIDATES, TOURNAMENT_RESULTS: lectura pública para
-- usuarios logueados, escritura solo admin.
drop policy if exists "teams_select_authenticated"   on public.teams;
drop policy if exists "teams_admin_write"            on public.teams;
create policy "teams_select_authenticated"
  on public.teams for select to authenticated using (true);
create policy "teams_admin_write"
  on public.teams for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matches_select_authenticated" on public.matches;
drop policy if exists "matches_admin_write"          on public.matches;
create policy "matches_select_authenticated"
  on public.matches for select to authenticated using (true);
create policy "matches_admin_write"
  on public.matches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pichichi_select_authenticated" on public.pichichi_candidates;
drop policy if exists "pichichi_admin_write"          on public.pichichi_candidates;
create policy "pichichi_select_authenticated"
  on public.pichichi_candidates for select to authenticated using (true);
create policy "pichichi_admin_write"
  on public.pichichi_candidates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "results_select_authenticated" on public.tournament_results;
drop policy if exists "results_admin_write"          on public.tournament_results;
create policy "results_select_authenticated"
  on public.tournament_results for select to authenticated using (true);
create policy "results_admin_write"
  on public.tournament_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- PREDICTIONS: ves las tuyas siempre. Las de otros solo cuando ya empezó el
-- partido (kickoff <= now). Insertas/editas las tuyas siempre que el partido
-- no haya empezado.
drop policy if exists "predictions_select_own_or_started" on public.predictions;
drop policy if exists "predictions_write_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_update_own_before_kickoff" on public.predictions;
drop policy if exists "predictions_delete_own_before_kickoff" on public.predictions;
create policy "predictions_select_own_or_started"
  on public.predictions for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.matches m
      where m.id = predictions.match_id and m.kickoff_at <= now()
    )
  );
create policy "predictions_write_own_before_kickoff"
  on public.predictions for insert
  to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id and m.kickoff_at > now()
    )
  );
create policy "predictions_update_own_before_kickoff"
  on public.predictions for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id and m.kickoff_at > now()
    )
  );
create policy "predictions_delete_own_before_kickoff"
  on public.predictions for delete
  to authenticated using (
    user_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = predictions.match_id and m.kickoff_at > now()
    )
  );


-- USER_PICKS: ves los tuyos. Los de otros solo cuando empieza el primer
-- partido del torneo. Editas los tuyos solo antes del primer kickoff.
create or replace function public.tournament_started()
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.matches where kickoff_at <= now());
$$;

drop policy if exists "picks_select_own_or_started"   on public.user_picks;
drop policy if exists "picks_write_own_before_start"  on public.user_picks;
drop policy if exists "picks_update_own_before_start" on public.user_picks;
drop policy if exists "picks_delete_own_before_start" on public.user_picks;
create policy "picks_select_own_or_started"
  on public.user_picks for select
  to authenticated using (
    user_id = auth.uid()
    or public.is_admin()
    or public.tournament_started()
  );
create policy "picks_write_own_before_start"
  on public.user_picks for insert
  to authenticated with check (
    user_id = auth.uid() and not public.tournament_started()
  );
create policy "picks_update_own_before_start"
  on public.user_picks for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and not public.tournament_started());
create policy "picks_delete_own_before_start"
  on public.user_picks for delete
  to authenticated using (
    user_id = auth.uid() and not public.tournament_started()
  );


-- =============================================================================
-- HELPER: unirse a una liga por código (case-insensitive)
-- =============================================================================
-- El cliente lo invoca con: supabase.rpc('join_league_by_code', { p_code: 'XXX' })
-- Devuelve la fila de league_members insertada, o lanza error si el código
-- no existe.

create or replace function public.join_league_by_code(p_code text)
returns public.league_members
language plpgsql
security invoker
as $$
declare
  v_league_id uuid;
  v_member public.league_members;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión para entrar a una liga';
  end if;

  select id into v_league_id
  from public.leagues
  where code = upper(trim(p_code));

  if v_league_id is null then
    raise exception 'El código % no existe', p_code using errcode = 'P0002';
  end if;

  insert into public.league_members (league_id, user_id)
  values (v_league_id, auth.uid())
  on conflict do nothing
  returning * into v_member;

  -- Si el conflict no devolvió nada, traemos la fila existente
  if v_member is null then
    select * into v_member
    from public.league_members
    where league_id = v_league_id and user_id = auth.uid();
  end if;

  return v_member;
end;
$$;
