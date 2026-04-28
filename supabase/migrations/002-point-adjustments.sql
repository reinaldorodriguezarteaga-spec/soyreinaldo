-- =============================================================================
-- Point adjustments — penalizaciones y bonus manuales del admin por liga
-- =============================================================================
-- Cada ajuste tiene un motivo escrito (auditable). El delta puede ser
-- negativo (penalización) o positivo (bonus). Los ajustes son por liga, así
-- una bronca en el grupo de WhatsApp familiar no afecta a la comunidad.
-- =============================================================================

create table if not exists public.point_adjustments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_adj_league on public.point_adjustments(league_id);
create index if not exists idx_adj_user on public.point_adjustments(user_id);
create index if not exists idx_adj_league_user on public.point_adjustments(league_id, user_id);

alter table public.point_adjustments enable row level security;

drop policy if exists "adj_select_member_or_admin" on public.point_adjustments;
create policy "adj_select_member_or_admin"
  on public.point_adjustments for select
  to authenticated using (
    public.is_admin() or public.is_league_member(league_id)
  );

drop policy if exists "adj_admin_write" on public.point_adjustments;
create policy "adj_admin_write"
  on public.point_adjustments for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
