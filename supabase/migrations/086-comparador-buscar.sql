-- Comparador de jugadores (22-oct): el buscador sale de las plantillas que ya
-- guarda el cron en sports_cache (~370 equipos), sin llamar a la API. Así
-- nadie puede gastar cuota pidiendo jugadores al azar: el comparador solo
-- consulta estadísticas de ids que estén aquí o en la lista curada de la web.

create or replace function public.comparador_buscar(p_q text, p_limite int default 12)
returns table(id int, nombre text, foto text)
language sql stable security definer set search_path = public as $$
  select distinct on ((p->>'id')::int) (p->>'id')::int, p->>'name', p->>'photo'
  from public.sports_cache s, jsonb_array_elements(s.data) p
  where s.cache_key like 'squad:%'
    and length(trim(p_q)) >= 3
    and public.unaccent(lower(p->>'name')) like '%' || public.unaccent(lower(trim(p_q))) || '%'
  order by (p->>'id')::int
  limit p_limite;
$$;
grant execute on function public.comparador_buscar(text, int) to anon, authenticated;

-- ¿Está este id en alguna plantilla guardada? (para validar lo que llega por la URL)
create or replace function public.comparador_existe(p_id int)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sports_cache s, jsonb_array_elements(s.data) p
    where s.cache_key like 'squad:%' and (p->>'id')::int = p_id
  );
$$;
grant execute on function public.comparador_existe(int) to anon, authenticated;
