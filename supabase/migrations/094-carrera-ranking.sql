-- Ranking del modo carrera (27-oct, pedido del dueño: «un ranking de los
-- mejores 10 así la gente compite»). Cada carrera terminada con sesión deja
-- una fila. El legado NO lo manda el navegador: el servidor rejuega la
-- carrera con sus decisiones (el motor va con semilla) y lo calcula él.
-- Escribe solo el servidor (service role); la lectura es pública.

create table if not exists public.carrera_records (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  jugador text not null check (char_length(jugador) between 1 and 30),
  nacion text not null,
  posicion text not null check (posicion in ('POR', 'DEF', 'MED', 'DEL')),
  legado int not null,
  titulo text not null,
  temporadas int not null,
  partidos int not null,
  goles int not null,
  titulos int not null,
  balones int not null,
  media_max int not null,
  clubes int[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists carrera_records_legado on public.carrera_records (legado desc);
create index if not exists carrera_records_usuario on public.carrera_records (user_id, created_at desc);

alter table public.carrera_records enable row level security;

-- Top: la mejor carrera de cada persona, con su nombre de la web.
create or replace function public.carrera_top(p_limite int default 10)
returns table(user_id uuid, usuario text, jugador text, nacion text, posicion text, legado int, titulo text,
              temporadas int, partidos int, goles int, titulos int, balones int, media_max int, clubes int[], created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select * from (
    select distinct on (r.user_id)
      r.user_id, coalesce(nullif(p.display_name, ''), p.username, 'Anónimo'), r.jugador, r.nacion, r.posicion, r.legado, r.titulo,
      r.temporadas, r.partidos, r.goles, r.titulos, r.balones, r.media_max, r.clubes, r.created_at
    from public.carrera_records r
    left join public.profiles p on p.id = r.user_id
    order by r.user_id, r.legado desc, r.created_at
  ) mejores
  order by legado desc, created_at
  limit least(p_limite, 50);
$$;
grant execute on function public.carrera_top(int) to anon, authenticated;
