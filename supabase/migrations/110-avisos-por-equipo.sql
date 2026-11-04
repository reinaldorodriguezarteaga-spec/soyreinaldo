-- =============================================================================
-- Avisos a la carta por equipo favorito (4-nov-2026, pedido del dueño)
-- =============================================================================
-- Hasta ahora, tener un equipo en favoritos era recibir todo: inicio, cada gol
-- y el final. Hay quien lo quiere arriba solo para saber cómo acabó, y quien
-- lo sigue minuto a minuto. Cada favorito de equipo guarda ahora su nivel:
--   'todo'  → inicio, goles y final (lo de siempre; valor por defecto)
--   'final' → solo el resultado final
--   'nada'  → sin avisos (sigue arriba en favoritos)
--
-- Las tres funciones de destinos (web, iPhone, Android) reciben el tipo de
-- aviso. El parámetro nuevo lleva valor por defecto, así que el código que
-- aún no lo manda sigue funcionando mientras se despliega.
--
-- Idempotente.
-- =============================================================================

alter table public.user_favorites
  add column if not exists avisos text not null default 'todo';

alter table public.user_favorites drop constraint if exists user_favorites_avisos_check;
alter table public.user_favorites add constraint user_favorites_avisos_check
  check (avisos in ('todo', 'final', 'nada'));

-- Cada uno cambia los suyos (solo se toca `avisos` desde la web).
drop policy if exists favorites_update_own on public.user_favorites;
create policy favorites_update_own on public.user_favorites
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ¿Este favorito quiere este aviso? p_evento: 'gol' | 'inicio' | 'final'.
create or replace function public.favorito_quiere(p_avisos text, p_evento text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_avisos = 'todo' or (p_avisos = 'final' and p_evento = 'final');
$$;

-- Web Push
drop function if exists public.push_targets_for_team(text);
create or replace function public.push_targets_for_team(p_team_id text, p_evento text default 'gol')
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct s.endpoint, s.p256dh, s.auth
  from public.push_subscriptions s
  join public.user_favorites f on f.user_id = s.user_id
  where f.kind = 'team' and f.ref_id = p_team_id
    and public.favorito_quiere(f.avisos, p_evento);
$$;
revoke all on function public.push_targets_for_team(text, text) from public, anon, authenticated;
grant execute on function public.push_targets_for_team(text, text) to service_role;

-- iPhone
drop function if exists public.apns_targets_for_team(text);
create or replace function public.apns_targets_for_team(p_team_id text, p_evento text default 'gol')
returns table (token text, entorno text)
language sql
stable
security definer
set search_path = public
as $$
  select d.token, d.entorno
  from public.push_dispositivos d
  join public.user_favorites f on f.user_id = d.user_id
  where f.kind = 'team' and f.ref_id = p_team_id and d.plataforma = 'ios'
    and public.favorito_quiere(f.avisos, p_evento);
$$;
revoke all on function public.apns_targets_for_team(text, text) from public, anon, authenticated;
grant execute on function public.apns_targets_for_team(text, text) to service_role;

-- Android
drop function if exists public.fcm_targets_for_team(text);
create or replace function public.fcm_targets_for_team(p_team_id text, p_evento text default 'gol')
returns table (token text)
language sql
stable
security definer
set search_path = public
as $$
  select d.token
  from public.push_dispositivos d
  join public.user_favorites f on f.user_id = d.user_id
  where f.kind = 'team' and f.ref_id = p_team_id and d.plataforma = 'android'
    and public.favorito_quiere(f.avisos, p_evento);
$$;
revoke all on function public.fcm_targets_for_team(text, text) from public, anon, authenticated;
grant execute on function public.fcm_targets_for_team(text, text) to service_role;
