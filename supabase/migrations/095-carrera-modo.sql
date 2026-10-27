-- Modo carrera: versión rápida o extendida (28-oct, pedido del dueño), cada
-- una con su top 10: la extendida tiene el doble de decisiones.
alter table public.carrera_records add column if not exists modo text not null default 'rapida'
  check (modo in ('rapida', 'extendida'));

drop function if exists public.carrera_top(int);
create or replace function public.carrera_top(p_limite int default 10, p_modo text default 'rapida')
returns table(user_id uuid, usuario text, jugador text, nacion text, posicion text, legado int, titulo text,
              temporadas int, partidos int, goles int, titulos int, balones int, media_max int, clubes int[], created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select distinct on (r.user_id)
      r.user_id, coalesce(nullif(p.display_name, ''), p.username, 'Anónimo'), r.jugador, r.nacion, r.posicion, r.legado, r.titulo,
      r.temporadas, r.partidos, r.goles, r.titulos, r.balones, r.media_max, r.clubes, r.created_at
    from public.carrera_records r
    left join public.profiles p on p.id = r.user_id
    where r.modo = p_modo
    order by r.user_id, r.legado desc, r.created_at
  ) mejores
  order by legado desc, created_at
  limit least(p_limite, 50);
$$;
grant execute on function public.carrera_top(int, text) to anon, authenticated;
