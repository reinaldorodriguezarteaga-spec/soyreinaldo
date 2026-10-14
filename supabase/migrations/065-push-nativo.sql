-- =============================================================================
-- 065 · Avisos de gol NATIVOS (app de iPhone, versión 1.1 — 15-oct-2026)
-- =============================================================================
-- Los avisos web (push_subscriptions + VAPID) no funcionan dentro de la app:
-- el webview de iOS no tiene Web Push. La app 1.1 registra el iPhone en APNs
-- (el servicio de avisos de Apple) y guarda aquí su token. El servidor avisa
-- con los MISMOS criterios que en la web: goles de los equipos favoritos y
-- recordatorios de la quiniela (lib/push/server.ts → lib/push/apns.ts).
--
-- La clave de Apple (.p8) vive en el Vault, como las VAPID (migración 046):
--   apns_key_id   → el "Key ID" de la clave en developer.apple.com
--   apns_team_id  → el Team ID (3NC77GQ583)
--   apns_p8       → el contenido del .p8 (BEGIN/END PRIVATE KEY incluidos)
-- =============================================================================

create table if not exists public.push_dispositivos (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plataforma text not null default 'ios' check (plataforma in ('ios', 'android')),
  -- 'production' = App Store y TestFlight; 'sandbox' = compilaciones de Xcode.
  -- Se corrige solo: si Apple dice que el token no es de producción, el
  -- servidor prueba en sandbox y lo apunta.
  entorno text not null default 'production' check (entorno in ('production', 'sandbox')),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index if not exists push_dispositivos_user on public.push_dispositivos (user_id);

alter table public.push_dispositivos enable row level security;
drop policy if exists push_dispositivos_own on public.push_dispositivos;
create policy push_dispositivos_own on public.push_dispositivos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- iPhones a avisar cuando marca un equipo: los de quien lo tenga en favoritos.
-- Solo el servidor (service role), como push_targets_for_team (migración 053).
create or replace function public.apns_targets_for_team(p_team_id text)
returns table (token text, entorno text)
language sql
stable
security definer
set search_path = public
as $$
  select d.token, d.entorno
  from public.push_dispositivos d
  join public.user_favorites f on f.user_id = d.user_id
  where f.kind = 'team' and f.ref_id = p_team_id and d.plataforma = 'ios';
$$;
revoke all on function public.apns_targets_for_team(text) from public, anon, authenticated;
grant execute on function public.apns_targets_for_team(text) to service_role;

-- La clave de Apple, desde el Vault. Solo el servidor.
create or replace function public.push_apns_key()
returns table (key_id text, team_id text, p8 text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'apns_key_id'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'apns_team_id'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'apns_p8');
$$;
revoke all on function public.push_apns_key() from public, anon, authenticated;
grant execute on function public.push_apns_key() to service_role;
