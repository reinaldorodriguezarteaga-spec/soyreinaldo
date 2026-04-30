-- Public preview of a league by code so the /unirse/[code] page can show
-- the league name and member count even to visitors that aren't logged in
-- yet (the leagues table itself is RLS'd to authenticated only).
--
-- Returns null if the code does not exist (so the caller distinguishes
-- "not found" from "no permission").

create or replace function public.get_league_public_preview(p_code text)
returns table (
  id uuid,
  name text,
  description text,
  member_count int
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.name,
    l.description,
    (select count(*)::int from public.league_members m where m.league_id = l.id) as member_count
  from public.leagues l
  where l.code = upper(trim(p_code));
$$;

revoke all on function public.get_league_public_preview(text) from public;
grant execute on function public.get_league_public_preview(text) to anon, authenticated;
