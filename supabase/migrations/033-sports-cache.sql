-- Caché genérica precalculada para datos de API-Football que hoy se piden en
-- vivo en CADA render de la portada/liga (tabla, calendario, marcador de
-- hoy) — con 9 competiciones activas eso son ~39 llamadas por refresco de
-- caché, y un pico de tráfico (o un crawler) puede agotar la cuota diaria en
-- minutos (incidente 13-ago). Mismo principio que ya funciona de sobra para
-- marcadores en vivo (cron externo → tabla `matches`/`lq_matches`, la app
-- lee de ahí, no de la API): un cron externo (cron-job.org, cada 5-10 min)
-- llama a /api/cron/refresh-sports-cache, que rellena esta tabla; la app lee
-- de aquí primero y solo cae a la API en vivo si el caché está vacío o
-- viejo. Así el consumo de cuota queda acotado por la frecuencia del cron,
-- no por cuántos visitantes (o bots) entren a la vez.

create table if not exists public.sports_cache (
  cache_key  text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.sports_cache enable row level security;

-- Lectura pública (la portada la lee sin sesión). Escritura: solo
-- service-role (el cron), que salta RLS — sin política de INSERT/UPDATE
-- para authenticated/anon a propósito.
drop policy if exists sports_cache_read on public.sports_cache;
create policy sports_cache_read on public.sports_cache for select using (true);
