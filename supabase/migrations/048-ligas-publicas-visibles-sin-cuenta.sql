-- =============================================================================
-- Las ligas públicas vuelven a verse sin cuenta
-- =============================================================================
-- Al cerrar la fuga de códigos (migración 041) la política quedó limitada a
-- `authenticated`, y con eso un visitante SIN cuenta dejó de poder leer la
-- tabla entera — incluidas las ligas públicas, que no tienen nada que
-- esconder.
--
-- Se notó al leer el baremo de la quiniela para anunciarlo en la portada y en
-- la clasificación (ambas abiertas al público): la consulta no devolvía nada
-- y la web seguía anunciando el baremo por defecto en vez del real.
--
-- Las privadas siguen invisibles para quien no es miembro: eso no cambia.
-- =============================================================================

drop policy if exists leagues_select_publicas_anon on public.leagues;
create policy leagues_select_publicas_anon
  on public.leagues for select
  to anon
  using (is_public);
