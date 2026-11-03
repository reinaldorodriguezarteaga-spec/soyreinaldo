-- =============================================================================
-- Liga privada "Postquiniela by CarBarça" (3-nov-2026)
-- =============================================================================
-- CarBarça aloja la quiniela de su comunidad en la web. Pedido del dueño:
-- «tal cual la nuestra», así que copia el baremo de la de los Conos (5 exacto
-- / 2 acierto, especiales activos, mismos puntos de cada especial). Privada,
-- sin anunciar: se entra con el código o el enlace de invitación.
--
-- Admin de partida: el dueño (no tenemos aún la cuenta de CarBarça). Cuando
-- CarBarça entre con el enlace, se le hace admin desde la gestión de la liga.
--
-- Idempotente.
-- =============================================================================

insert into public.leagues (
  name, code, description, kind, is_public, created_by,
  lq_points_exact, lq_points_result, lq_points_champion, lq_points_pichichi,
  lq_points_relegated, lq_specials_enabled, lq_points_gk, lq_points_assist,
  lq_points_mvp, lq_points_defense, lq_points_attack
)
select
  'Postquiniela by CarBarça',
  'POSTQUINIELA',
  'La quiniela de LaLiga 2026-27 de CarBarça y su comunidad. Marcador exacto = 5 pts, acertar el ganador = 2 pts.',
  'clubs',
  false,
  c.created_by,
  c.lq_points_exact, c.lq_points_result, c.lq_points_champion, c.lq_points_pichichi,
  c.lq_points_relegated, c.lq_specials_enabled, c.lq_points_gk, c.lq_points_assist,
  c.lq_points_mvp, c.lq_points_defense, c.lq_points_attack
from public.leagues c
where c.id = '9f992fa0-5f45-4204-87a7-b4c5feda6ae1' -- La de los Conos (id estable)
on conflict (code) do nothing;

insert into public.league_members (league_id, user_id, role)
select l.id, l.created_by, 'admin'
from public.leagues l
where l.code = 'POSTQUINIELA' and l.created_by is not null
on conflict (league_id, user_id) do update set role = 'admin';
