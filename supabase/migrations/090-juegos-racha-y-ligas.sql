-- Juegos, más motivos para volver (23-oct, pedido del dueño):
--  1. Racha: días seguidos con algún reto del día jugado (sale de
--     juego_resultados, migración 085).
--  2. Ligas privadas: el ranking de los juegos solo con tus amigos, por código.
--  3. Aviso de la racha: por la tarde, a quien jugó ayer y aún no hoy (cron
--     `racha-juegos`, que respeta profiles.wants_reminders).
-- Escribe solo el servidor (server actions con service role); el usuario lee
-- lo suyo y los rankings salen por función.

-- ── Racha ──
create or replace function public.juegos_racha_de(p_user uuid, p_hasta int)
returns int language plpgsql stable security definer set search_path = public as $$
declare
  n int := 0;
  d int := p_hasta;
begin
  while exists (select 1 from public.juego_resultados where user_id = p_user and dia = d) loop
    n := n + 1;
    d := d - 1;
  end loop;
  return n;
end $$;
revoke all on function public.juegos_racha_de(uuid, int) from public, anon, authenticated;

-- La mía: hasta hoy si ya jugué hoy; si no, hasta ayer (aún puedo salvarla).
create or replace function public.juegos_mi_racha(p_hoy int)
returns int language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 0
    when exists (select 1 from public.juego_resultados where user_id = auth.uid() and dia = p_hoy)
      then public.juegos_racha_de(auth.uid(), p_hoy)
    else public.juegos_racha_de(auth.uid(), p_hoy - 1)
  end;
$$;
grant execute on function public.juegos_mi_racha(int) to authenticated;

-- A quién avisar hoy: jugó ayer, aún no hoy y no se dio de baja de avisos.
create or replace function public.juegos_rachas_en_peligro(p_hoy int)
returns table(user_id uuid, racha int)
language sql stable security definer set search_path = public as $$
  select r.user_id, public.juegos_racha_de(r.user_id, p_hoy - 1)
  from (select distinct user_id from public.juego_resultados where dia = p_hoy - 1) r
  join public.profiles p on p.id = r.user_id
  where coalesce(p.wants_reminders, true)
    and not exists (select 1 from public.juego_resultados h where h.user_id = r.user_id and h.dia = p_hoy);
$$;
revoke all on function public.juegos_rachas_en_peligro(int) from public, anon, authenticated;

-- ── Ligas privadas ──
create table if not exists public.juego_ligas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z0-9]{6}$'),
  nombre text not null check (char_length(nombre) between 2 and 40),
  creador uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.juego_liga_miembros (
  liga_id uuid not null references public.juego_ligas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liga_id, user_id)
);
create index if not exists juego_liga_miembros_user on public.juego_liga_miembros (user_id);

alter table public.juego_ligas enable row level security;
alter table public.juego_liga_miembros enable row level security;

drop policy if exists juego_liga_miembros_propios on public.juego_liga_miembros;
create policy juego_liga_miembros_propios on public.juego_liga_miembros for select to authenticated
  using (user_id = auth.uid());
drop policy if exists juego_ligas_mias on public.juego_ligas;
create policy juego_ligas_mias on public.juego_ligas for select to authenticated
  using (exists (select 1 from public.juego_liga_miembros m where m.liga_id = juego_ligas.id and m.user_id = auth.uid()));

-- Clasificación de una liga: solo para sus miembros, y salen todos (también
-- los que aún no han sumado), para que se vea quién falta por jugar.
create or replace function public.juegos_ranking_liga(p_liga uuid, p_desde_dia int)
returns table(user_id uuid, nombre text, puntos int, partidas int)
language sql stable security definer set search_path = public as $$
  select m.user_id,
         coalesce(nullif(p.display_name, ''), p.username, 'Anónimo'),
         coalesce(sum(r.puntos), 0)::int,
         count(r.dia)::int
  from public.juego_liga_miembros m
  left join public.profiles p on p.id = m.user_id
  left join public.juego_resultados r on r.user_id = m.user_id and r.dia >= p_desde_dia
  where m.liga_id = p_liga
    and exists (select 1 from public.juego_liga_miembros yo where yo.liga_id = p_liga and yo.user_id = auth.uid())
  group by m.user_id, p.display_name, p.username
  order by 3 desc, 4 asc, 2;
$$;
grant execute on function public.juegos_ranking_liga(uuid, int) to authenticated;

-- ── Aviso de la racha: 18:00 UTC (las 19:00 o 20:00 en España) ──
select cron.unschedule('racha-juegos') where exists (select 1 from cron.job where jobname = 'racha-juegos');
select cron.schedule(
  'racha-juegos',
  '0 18 * * *',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/racha-juegos',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 55000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
