-- =============================================================================
-- Recordatorios por email: preferencias del usuario
-- =============================================================================
-- - wants_reminders: el usuario quiere recibir recordatorios (default true)
-- - unsubscribe_token: token estable que va en el link "darse de baja" del
--   email. Cuando lo abren, marcamos wants_reminders = false.
-- =============================================================================

alter table public.profiles
  add column if not exists wants_reminders boolean not null default true;

alter table public.profiles
  add column if not exists unsubscribe_token uuid default gen_random_uuid();

-- Backfill de tokens para perfiles existentes
update public.profiles
set unsubscribe_token = gen_random_uuid()
where unsubscribe_token is null;

alter table public.profiles
  alter column unsubscribe_token set not null;

create index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);


-- =============================================================================
-- RPC para el cron — devuelve la lista de usuarios + sus partidos pendientes
-- Devuelve solo usuarios con wants_reminders=true.
-- p_window_hours: ventana de tiempo desde now() hacia adelante.
-- =============================================================================

create or replace function public.get_pending_reminders(p_window_hours int)
returns table (
  user_id uuid,
  email text,
  display_name text,
  unsubscribe_token uuid,
  pending jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with upcoming as (
    select
      m.id,
      m.kickoff_at,
      m.venue,
      m.group_letter,
      m.phase,
      coalesce(home.name, m.team_home_placeholder, '?') as home_name,
      coalesce(home.flag_emoji, '🏟️') as home_flag,
      coalesce(away.name, m.team_away_placeholder, '?') as away_name,
      coalesce(away.flag_emoji, '🏟️') as away_flag,
      m.team_home is not null and m.team_away is not null as has_teams
    from public.matches m
    left join public.teams home on home.id = m.team_home
    left join public.teams away on away.id = m.team_away
    where m.kickoff_at > now()
      and m.kickoff_at <= now() + (p_window_hours || ' hours')::interval
  ),
  per_user as (
    select
      p.id as user_id,
      au.email,
      p.display_name,
      p.unsubscribe_token,
      jsonb_agg(
        jsonb_build_object(
          'id', u.id,
          'kickoff_at', u.kickoff_at,
          'venue', u.venue,
          'group_letter', u.group_letter,
          'phase', u.phase,
          'home_name', u.home_name,
          'home_flag', u.home_flag,
          'away_name', u.away_name,
          'away_flag', u.away_flag
        )
        order by u.kickoff_at
      ) filter (
        where u.has_teams
          and not exists (
            select 1 from public.predictions pred
            where pred.user_id = p.id and pred.match_id = u.id
          )
      ) as pending
    from public.profiles p
    join auth.users au on au.id = p.id
    cross join upcoming u
    where p.wants_reminders is true
      and au.email is not null
    group by p.id, au.email, p.display_name, p.unsubscribe_token
  )
  select
    user_id, email, display_name, unsubscribe_token, pending
  from per_user
  where pending is not null and jsonb_array_length(pending) > 0;
$$;

revoke all on function public.get_pending_reminders(int) from public, anon, authenticated;
-- Solo se puede ejecutar con service_role (anon/authenticated NO la pueden invocar)
