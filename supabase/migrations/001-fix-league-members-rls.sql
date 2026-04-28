-- =============================================================================
-- Fix: infinite recursion in public.league_members SELECT policy
-- =============================================================================
-- The original policy referenced league_members in its own USING clause,
-- which Postgres evaluates recursively and aborts. Replace with a SECURITY
-- DEFINER function that runs with elevated privileges and breaks the loop.
-- =============================================================================

create or replace function public.is_league_member(p_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  );
$$;

drop policy if exists "members_select_own_leagues" on public.league_members;
create policy "members_select_own_leagues"
  on public.league_members for select
  to authenticated using (
    public.is_admin() or public.is_league_member(league_id)
  );
