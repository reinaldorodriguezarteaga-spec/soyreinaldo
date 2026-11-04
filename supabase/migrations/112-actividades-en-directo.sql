-- =============================================================================
-- Actividades en directo del iPhone (4-nov-2026, pedido del dueño)
-- =============================================================================
-- El marcador del partido en la pantalla de bloqueo y en la isla dinámica,
-- al minuto, como en las apps grandes de marcadores.
--
-- · Un CANAL de APNs por partido (envío «broadcast», iOS 18+): la ingesta en
--   vivo manda UNA actualización por cambio y Apple la reparte a todos los
--   iPhones que siguen ese partido. Se crea al empezar (o cuando alguien lo
--   sigue a mano desde la app) y se borra al acabar.
-- · TOKENS DE ARRANQUE (push-to-start): con ellos el servidor enciende la
--   actividad sola al empezar el partido, a quien tenga a uno de los dos
--   equipos en favoritos con avisos «Todo» (migración 110).
--
-- Solo el servidor (service role): RLS sin políticas.
-- Idempotente.
-- =============================================================================

create table if not exists public.la_canales (
  partido_id bigint primary key,
  canal text not null,
  creado timestamptz not null default now()
);
alter table public.la_canales enable row level security;

create table if not exists public.la_tokens_inicio (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  entorno text not null default 'production' check (entorno in ('production', 'sandbox')),
  actualizado timestamptz not null default now()
);
create index if not exists la_tokens_inicio_user on public.la_tokens_inicio (user_id);
alter table public.la_tokens_inicio enable row level security;

-- iPhones a los que encender la actividad al empezar un partido.
create or replace function public.la_targets_inicio(p_home text, p_away text)
returns table (token text, entorno text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct t.token, t.entorno
  from public.la_tokens_inicio t
  join public.user_favorites f on f.user_id = t.user_id
  where f.kind = 'team' and f.ref_id in (p_home, p_away) and f.avisos = 'todo';
$$;
revoke all on function public.la_targets_inicio(text, text) from public, anon, authenticated;
grant execute on function public.la_targets_inicio(text, text) to service_role;
