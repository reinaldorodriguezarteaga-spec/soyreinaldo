-- Buscador de jugadores (comparador y tiki-taka, 23-oct): devuelve también el
-- equipo de la plantilla en la que está (squad:<id>), para distinguir a los
-- que se llaman igual («E. Fernández» hay tres).
drop function if exists public.comparador_buscar(text, int);
create or replace function public.comparador_buscar(p_q text, p_limite int default 12)
returns table(id int, nombre text, foto text, equipo int)
language sql stable security definer set search_path = public as $$
  select distinct on ((p->>'id')::int) (p->>'id')::int, p->>'name', p->>'photo',
         nullif(split_part(s.cache_key, ':', 2), '')::int
  from public.sports_cache s, jsonb_array_elements(s.data) p
  where s.cache_key like 'squad:%'
    and length(trim(p_q)) >= 3
    and public.unaccent(lower(p->>'name')) like '%' || public.unaccent(lower(trim(p_q))) || '%'
  order by (p->>'id')::int
  limit p_limite;
$$;
grant execute on function public.comparador_buscar(text, int) to anon, authenticated;
