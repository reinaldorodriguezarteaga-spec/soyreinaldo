-- =============================================================================
-- Reinaldo, admin de liga en la general y en la de Pacha
-- =============================================================================
-- Ya es admin GLOBAL del sitio (`profiles.is_admin`), pero el panel de liga
-- (/quiniela-liga/liga/[code]) exige pertenecer a la liga: sin membresía no
-- hay pestaña de gestión que enseñar. Esto le da el rol dentro de las dos.
--
-- Efecto secundario a la vista: al entrar en la de Pacha aparece en SU
-- clasificación. Se sale con un `delete` si molesta.
--
-- Idempotente.
-- =============================================================================

-- Liga general: ya era miembro, solo sube de rol.
update public.league_members m
set role = 'admin'
from auth.users u
where m.user_id = u.id
  and lower(u.email) = 'reinaldo_r@live.com'
  and m.league_id = (select id from public.leagues where code = 'LALIGA2627');

-- Liga de Pacha: alta como admin (Pacha sigue siendo admin también).
insert into public.league_members (league_id, user_id, role)
select l.id, u.id, 'admin'
from public.leagues l
cross join auth.users u
where l.code = 'PACHA'
  and lower(u.email) = 'reinaldo_r@live.com'
on conflict (league_id, user_id) do update set role = 'admin';
