-- Buscador por relevancia (30-oct): además del equipo que se enseña, TODOS
-- los equipos en cuya plantilla está el jugador (club y selección). Con uno
-- solo, a Enzo Fernández le tocaba Argentina y no contaba que juega en el
-- Chelsea, que es lo que lo sube en la lista.
drop function if exists public.comparador_buscar(text, int);
create or replace function public.comparador_buscar(p_q text, p_limite int default 12)
returns table(id int, nombre text, foto text, equipo int, equipos int[])
language sql stable security definer set search_path = public as $$
  select (p->>'id')::int, min(p->>'name'), min(p->>'photo'),
         min(nullif(split_part(s.cache_key, ':', 2), '')::int),
         array_agg(distinct nullif(split_part(s.cache_key, ':', 2), '')::int)
  from public.sports_cache s, jsonb_array_elements(s.data) p
  where s.cache_key like 'squad:%'
    and length(trim(p_q)) >= 3
    and public.unaccent(lower(p->>'name')) like '%' || public.unaccent(lower(trim(p_q))) || '%'
  group by (p->>'id')::int
  order by (p->>'id')::int
  limit p_limite;
$$;
grant execute on function public.comparador_buscar(text, int) to anon, authenticated;
