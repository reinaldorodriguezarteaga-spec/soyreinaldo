-- =============================================================================
-- Favoritos por usuario: competiciones y equipos
-- =============================================================================
-- Ni competiciones ni equipos (salvo los 48 del Mundial) son entidades de
-- esta BD — viven como config estática (competitions.ts) o vienen directo de
-- API-Football. Por eso se guarda label/link_path ya resueltos en vez de solo
-- un id a resolver luego (evita depender de que un id siga siendo válido en
-- competitions.ts, y evita una llamada a la API solo para pintar el nombre).
-- =============================================================================

create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('competition', 'team')),
  -- slug de Competition si kind='competition', id de equipo (como texto) si kind='team'.
  ref_id text not null,
  label text not null,
  link_path text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref_id)
);

alter table public.user_favorites enable row level security;

create policy "favorites_select_own"
  on public.user_favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.user_favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.user_favorites for delete
  to authenticated
  using (user_id = auth.uid());
