-- Panel de métricas del dueño (/admin/metricas, 17-oct).
--
-- actividad_diaria: un apunte por usuario con sesión, día y canal (app nativa
-- o web), para saber cuántos usan la app. Lo escribe la web una vez al día
-- por navegador (acción registrarActividad). Sin IP ni nada más.
--
-- admin_metricas(): todas las cifras del panel en un JSON. Solo la service
-- role (la página comprueba antes que quien mira es admin).

create table if not exists public.actividad_diaria (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null default (now() at time zone 'Europe/Madrid')::date,
  en_app boolean not null,
  primary key (user_id, dia, en_app)
);
alter table public.actividad_diaria enable row level security;
drop policy if exists actividad_insert_propia on public.actividad_diaria;
create policy actividad_insert_propia on public.actividad_diaria for insert to authenticated
  with check (user_id = auth.uid());

create or replace function public.admin_metricas()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cuentas', (select count(*) from auth.users),
    'confirmadas', (select count(*) from auth.users where email_confirmed_at is not null),
    'altas', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', d, 'n', n) order by d), '[]')
      from (
        -- Los 30 días enteros, también los que no hubo altas (0).
        select g::date d, count(u.id) n
        from generate_series(current_date - 29, current_date, interval '1 day') g
        left join auth.users u on (u.created_at at time zone 'Europe/Madrid')::date = g::date
        group by 1
      ) x),
    'activos', (
      select coalesce(jsonb_agg(jsonb_build_object('dia', dia, 'app', app, 'web', web) order by dia), '[]')
      from (
        select g::date dia, count(a.user_id) filter (where a.en_app) app, count(a.user_id) filter (where not a.en_app) web
        from generate_series(greatest(current_date - 29, date '2026-10-17'), current_date, interval '1 day') g
        left join public.actividad_diaria a on a.dia = g::date
        group by 1
      ) x),
    'activos_7d', (select jsonb_build_object(
        'app', count(distinct user_id) filter (where en_app),
        'web', count(distinct user_id) filter (where not en_app))
      from public.actividad_diaria where dia > current_date - 7),
    'jugadores_jornada', (
      select coalesce(jsonb_agg(jsonb_build_object('jornada', matchday, 'n', n) order by matchday), '[]')
      from (
        -- Solo jornadas ya empezadas (las futuras aún se están pronosticando).
        select m.matchday, count(distinct p.user_id) n
        from public.lq_predictions p join public.lq_matches m on m.id = p.match_id
        where m.counts_for_scoring
          and m.matchday in (select matchday from public.lq_matches where counts_for_scoring
                             group by matchday having min(kickoff_at) <= now())
        group by 1
      ) x),
    'duelos', (select jsonb_build_object(
        'total', count(*),
        'aceptados', count(*) filter (where estado = 'aceptado'),
        'pendientes', count(*) filter (where estado = 'pendiente'),
        'rechazados', count(*) filter (where estado = 'rechazado'))
      from public.lq_duelos),
    'encuestas', (select jsonb_build_object(
        'total', (select count(*) from public.encuestas),
        'votos', (select count(*) from public.encuesta_votos),
        'votantes', (select count(distinct user_id) from public.encuesta_votos))),
    'favoritos', (select jsonb_build_object(
        'con_favoritos', (select count(distinct user_id) from public.user_favorites),
        'con_mi_equipo', (select count(*) from public.profiles where mi_equipo_id is not null),
        'eligieron', (select count(*) from public.profiles where favoritos_elegidos_at is not null))),
    'avisos', (select jsonb_build_object(
        'web_push', (select count(*) from public.push_subscriptions),
        'iphone', (select count(*) from public.push_dispositivos),
        'aceptan_correos', (select count(*) from public.profiles where wants_reminders is not false))),
    'boletin', (
      select coalesce(jsonb_agg(jsonb_build_object('edicion', edicion, 'n', n) order by edicion desc), '[]')
      from (select edicion, count(*) n from public.boletin_envios group by 1 order by 1 desc limit 4) x)
  );
$$;
revoke all on function public.admin_metricas() from public, anon, authenticated;

-- INSERT ... ON CONFLICT DO NOTHING (el upsert de la web) exige poder leer
-- la fila propia; sin esto, la RLS rechaza el apunte.
drop policy if exists actividad_select_propia on public.actividad_diaria;
create policy actividad_select_propia on public.actividad_diaria for select to authenticated
  using (user_id = auth.uid());
