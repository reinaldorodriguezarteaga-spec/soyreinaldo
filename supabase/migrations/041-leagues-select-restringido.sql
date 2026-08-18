-- =============================================================================
-- El código de una liga privada deja de ser público
-- =============================================================================
-- `leagues_select_authenticated` era `using (true)`: CUALQUIER usuario
-- registrado podía leer la tabla entera desde el navegador con la anon key
-- —nombres y CÓDIGOS de todas las ligas privadas incluidos— y de hecho
-- `/quiniela` se lo pintaba en pantalla ("ligas privadas a las que no
-- perteneces"). Con eso, "solo se entra con invitación" no era cierto:
-- bastaba tener cuenta para sacar el código de cualquiera y colarse.
--
-- Ahora solo se ven: las públicas, las tuyas, y todas si eres admin del
-- sitio. La invitación por enlace sigue funcionando porque
-- `get_league_public_preview()` es SECURITY DEFINER y enseña solo nombre,
-- descripción y nº de miembros de la liga cuyo código ya conoces.
-- =============================================================================

drop policy if exists "leagues_select_authenticated" on public.leagues;
create policy "leagues_select_visible"
  on public.leagues for select
  to authenticated
  using (
    is_public
    or public.is_admin()
    or public.is_league_member(id)
  );
