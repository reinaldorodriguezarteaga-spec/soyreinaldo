-- Chequeo de seguridad del 24-sep-2026 (avisos del linter de Supabase,
-- comprobados llamando a la API pública SIN sesión con la clave anon):
--
-- 1. push_vapid_keys() devolvía la clave PRIVADA de las notificaciones push y
--    push_targets_for_team() los endpoints y claves de suscripción de los
--    usuarios. Con las dos, cualquiera podía mandar avisos falsos en nombre
--    de la web a quien los tuviera activados. Solo las usa el servidor
--    (lib/push/server.ts) con la service role.
-- 2. lookup_email_by_username() daba el email de cualquier usuario a partir
--    de su nombre, y los nombres salen públicos en la quiniela. El login ya
--    la llama con la service role (login/actions.ts). ⚠️ Revocarla ANTES de
--    desplegar ese cambio rompe el login por nombre de usuario.
-- 3. cron_jobs_activos() enseñaba los crons internos; solo la usa el cron
--    vigilante, con la service role.
--
-- La service role no pierde nada: no depende de estos GRANT.

revoke execute on function public.push_vapid_keys() from public, anon, authenticated;
revoke execute on function public.push_targets_for_team(text) from public, anon, authenticated;
revoke execute on function public.cron_jobs_activos() from public, anon, authenticated;
revoke execute on function public.lookup_email_by_username(text) from public, anon, authenticated;

-- search_path fijo (lint 0011): sin él, una función puede acabar resolviendo
-- nombres contra el esquema que tenga delante quien la llama. Todas son
-- SECURITY INVOKER y solo usan objetos de public (unaccent incluida).
alter function public.norm_name(text) set search_path = public;
alter function public.normalize_league_code() set search_path = public;
alter function public.tournament_started() set search_path = public;
alter function public.join_league_by_code(text) set search_path = public;
alter function public.normalize_username() set search_path = public;
alter function public.group_standings(text) set search_path = public;
alter function public.resolve_direct_placeholder(text) set search_path = public;
alter function public.touch_updated_at() set search_path = public;
alter function public.propagate_ko_result() set search_path = public;
alter function public.lq_touch_updated_at() set search_path = public;
alter function public.join_public_league(uuid) set search_path = public;
