-- Modo carrera: ranking de Balones de Oro (28-oct, pedido del dueño). La
-- columna `balones` existe desde la 094, así que cuentan todas las carreras.
create or replace function public.carrera_top_balones(p_limite int default 10)
returns table(user_id uuid, usuario text, jugador text, nacion text, posicion text, legado int, titulo text,
              temporadas int, partidos int, goles int, titulos int, balones int, media_max int, clubes int[],
              mundiales int, modo text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select distinct on (r.user_id)
      r.user_id, coalesce(nullif(p.display_name, ''), p.username, 'Anónimo'), r.jugador, r.nacion, r.posicion, r.legado, r.titulo,
      r.temporadas, r.partidos, r.goles, r.titulos, r.balones, r.media_max, r.clubes, r.mundiales, r.modo, r.created_at
    from public.carrera_records r
    left join public.profiles p on p.id = r.user_id
    where r.balones > 0
    order by r.user_id, r.balones desc, r.legado desc, r.created_at
  ) mejores
  order by balones desc, legado desc, created_at
  limit least(p_limite, 50);
$$;
grant execute on function public.carrera_top_balones(int) to anon, authenticated;
