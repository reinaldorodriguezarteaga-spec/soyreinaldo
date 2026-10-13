-- 061 · Directo en tiempo real (13-oct-2026).
--
-- Antes cada visitante preguntaba cada 20 s si había novedades (y cada
-- respuesta salía de una caché de 20 s): un gol tardaba 40-50 s en verse.
-- Ahora un solo cron (`directo`, cada 15 s, solo con partidos en juego)
-- hace UNA llamada `/fixtures?live=all` y guarda aquí el estado de cada
-- partido de nuestras competiciones; Supabase Realtime empuja cada cambio a
-- los navegadores abiertos, que se actualizan al momento.
--
-- `firma` resume lo que se ve (estado, minuto, goles, nº de eventos): solo se
-- escribe la fila si cambia, para no mandar avisos por nada.

create table if not exists public.partidos_directo (
  fixture_id int primary key,
  league_id int not null,
  data jsonb not null,
  firma text not null,
  actualizado timestamptz not null default now()
);
create index if not exists partidos_directo_actualizado on public.partidos_directo (actualizado);

alter table public.partidos_directo enable row level security;
-- Lectura pública (es lo mismo que enseña cualquier marcador); escritura
-- solo con la service role (el cron), que se salta la RLS.
drop policy if exists partidos_directo_select on public.partidos_directo;
create policy partidos_directo_select on public.partidos_directo
  for select to anon, authenticated using (true);

-- Latido del cron: se escribe en CADA vuelta aunque ningún partido cambie
-- (en el descanso el minuto no se mueve 15 min). La web solo se fía de
-- partidos_directo si el latido es reciente; si no, vuelve a la API.
create table if not exists public.directo_latido (
  id int primary key default 1 check (id = 1),
  latido timestamptz not null default now()
);
alter table public.directo_latido enable row level security;
drop policy if exists directo_latido_select on public.directo_latido;
create policy directo_latido_select on public.directo_latido
  for select to anon, authenticated using (true);

-- Realtime: emitir los cambios de esta tabla.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'partidos_directo'
  ) then
    alter publication supabase_realtime add table public.partidos_directo;
  end if;
end $$;

-- El cron, cada 15 s. La ruta no llama a la API si no hay partidos cerca.
select cron.unschedule('directo') where exists (
  select 1 from cron.job where jobname = 'directo');
select cron.schedule(
  'directo',
  '15 seconds',
  $job$
    select net.http_get(
      url := 'https://www.soyreinaldo.com/api/cron/directo',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.decrypted_secret),
      timeout_milliseconds := 14000
    )
    from vault.decrypted_secrets s
    where s.name = 'ingest_cron_secret';
  $job$
);
