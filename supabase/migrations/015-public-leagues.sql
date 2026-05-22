-- =============================================================================
-- Ligas públicas: cualquiera logueado puede unirse con 1 click, sin código
-- =============================================================================
-- Las ligas privadas (familiar, amigos, etc.) siguen requiriendo el código.
-- Las marcadas como is_public salen listadas en /quiniela con un botón
-- "Unirme" que llama al mismo RPC join_league_by_code.
-- =============================================================================

alter table public.leagues
  add column if not exists is_public boolean not null default false;

-- La Quiniela de los Conos es la pública por defecto (la que se anuncia
-- en redes y YouTube).
update public.leagues
set is_public = true
where code = 'CONOS2026';
