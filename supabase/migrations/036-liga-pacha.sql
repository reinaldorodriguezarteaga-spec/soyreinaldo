-- =============================================================================
-- Liga privada "Quiniela Pacha" (comunidad de Pacha) sobre LaLiga 2026-27
-- =============================================================================
-- Misma competición y mismas reglas que la quiniela de clubes que ya corre
-- (3 pts marcador exacto / 1 pt ganador + picks especiales); lo que cambia es
-- que la clasificación es suya: liga privada, sin listar, solo se entra con
-- el código o el enlace de invitación. Pacha manda dentro (admin de liga, ver
-- 034), no fuera.
--
-- Idempotente: se puede reaplicar sin duplicar nada.
-- =============================================================================

insert into public.leagues (name, code, description, kind, is_public, created_by)
select
  'Quiniela Pacha',
  'PACHA',
  'La quiniela de LaLiga de Pacha y su comunidad. Solo por invitación.',
  'clubs',
  false,
  u.id
from auth.users u
where lower(u.email) = 'lapacha.mkt@gmail.com'
on conflict (code) do nothing;

-- Pacha, admin de su liga.
insert into public.league_members (league_id, user_id, role)
select l.id, u.id, 'admin'
from public.leagues l
cross join auth.users u
where l.code = 'PACHA'
  and lower(u.email) = 'lapacha.mkt@gmail.com'
on conflict (league_id, user_id) do update set role = 'admin';
