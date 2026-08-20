-- =============================================================================
-- Acceso a las claves VAPID guardadas en el Vault
-- =============================================================================
-- Las genera `scripts/generate-vapid.mjs` y viven en el Vault, no en variables
-- de entorno: así la privada nunca pasa por el portapapeles de nadie ni queda
-- en un panel. El esquema `vault` no está expuesto por la API, así que hacen
-- falta estas dos funciones.
--
-- La PÚBLICA la puede leer cualquiera: su trabajo es viajar al navegador.
-- La PRIVADA solo el servidor (service_role), que es quien firma los envíos.
-- =============================================================================

create or replace function public.push_vapid_public_key()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key';
$$;

revoke all on function public.push_vapid_public_key() from public;
grant execute on function public.push_vapid_public_key() to anon, authenticated, service_role;

create or replace function public.push_vapid_keys()
returns table(public_key text, private_key text)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key');
$$;

revoke all on function public.push_vapid_keys() from public;
grant execute on function public.push_vapid_keys() to service_role;
