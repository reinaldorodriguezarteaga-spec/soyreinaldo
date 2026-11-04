-- =============================================================================
-- Avisos a Android por Firebase Cloud Messaging (app Android 1.1, 4-nov-2026)
-- =============================================================================
-- La cuenta de servicio de Firebase (proyecto soyreinaldoweb) vive en el Vault
-- como 'fcm_cuenta' (la guarda scripts/fcm-a-vault.mjs). Esta función la da
-- solo al servidor (service role), igual que push_apns_key (migración 065).
-- Los tokens de Android van a la misma push_dispositivos, con
-- plataforma = 'android'.
--
-- Idempotente.
-- =============================================================================

create or replace function public.push_fcm_cuenta()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'fcm_cuenta';
$$;

revoke all on function public.push_fcm_cuenta() from public, anon, authenticated;
grant execute on function public.push_fcm_cuenta() to service_role;

-- Destinos Android de un equipo (los de iPhone siguen en apns_targets_for_team).
create or replace function public.fcm_targets_for_team(p_team_id text)
returns table (token text)
language sql
stable
security definer
set search_path = public
as $$
  select d.token
  from public.push_dispositivos d
  join public.user_favorites f on f.user_id = d.user_id
  where f.kind = 'team' and f.ref_id = p_team_id and d.plataforma = 'android';
$$;

revoke all on function public.fcm_targets_for_team(text) from public, anon, authenticated;
grant execute on function public.fcm_targets_for_team(text) to service_role;
