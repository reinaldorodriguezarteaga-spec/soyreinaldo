-- =============================================================================
-- Contadores de lecturas y compartidos de los análisis
-- =============================================================================
-- El dueño quiere saber qué se lee y qué mueve a la gente. Dos matices que
-- condicionan el diseño:
--
-- 1) Esta web la crawlean MUCHO (tres incidentes de cuota; el último, el
--    crawler de IA de Meta con 35.100 peticiones en 24 h falseando el
--    User-Agent). Contar peticiones de servidor daría un número que MIENTE.
--    Por eso la vista NO se cuenta al renderizar: la dispara el navegador
--    unos segundos después de abrir el artículo (los rastreadores no ejecutan
--    ese ciclo ni esperan) y además se descarta aquí el User-Agent de bot.
--
-- 2) El de compartidos es el número honesto: exige una acción deliberada y
--    los bots no lo tocan.
--
-- Los contadores son columnas de `articles`, no una tabla de eventos: el dueño
-- quiere el total, no analítica por sesión, y así se lee gratis con el propio
-- artículo. Se incrementan por RPC SECURITY DEFINER porque la RLS de la tabla
-- solo deja escribir al admin.
-- =============================================================================

alter table public.articles
  add column if not exists view_count  int not null default 0,
  add column if not exists share_count int not null default 0;

-- Suma una lectura. Devuelve void a propósito: el cliente no necesita el
-- número y así no damos una vía de sondeo.
create or replace function public.articles_marcar_vista(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent text := lower(coalesce(
    current_setting('request.headers', true)::json ->> 'user-agent', ''));
begin
  -- Rastreadores conocidos y clientes sin UA: no son lecturas de nadie.
  if v_agent = '' or v_agent ~ '(bot|crawl|spider|slurp|scrape|headless|python-requests|curl|wget|httpclient|axios|node-fetch|facebookexternalhit|meta-external|gptbot|claudebot|ccbot|bytespider|dataforseo|semrush|ahrefs)' then
    return;
  end if;

  update public.articles
     set view_count = view_count + 1
   where slug = p_slug
     and published_at is not null
     and published_at <= now();
end;
$$;

-- Suma un compartido. Mismo filtro por coherencia, aunque aquí el ruido es
-- casi nulo: hay que pulsar un botón.
create or replace function public.articles_marcar_compartido(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent text := lower(coalesce(
    current_setting('request.headers', true)::json ->> 'user-agent', ''));
begin
  if v_agent = '' or v_agent ~ '(bot|crawl|spider|slurp|scrape|headless|python-requests|curl|wget|httpclient|axios|node-fetch)' then
    return;
  end if;

  update public.articles
     set share_count = share_count + 1
   where slug = p_slug
     and published_at is not null
     and published_at <= now();
end;
$$;

revoke all on function public.articles_marcar_vista(text) from public;
revoke all on function public.articles_marcar_compartido(text) from public;
grant execute on function public.articles_marcar_vista(text) to anon, authenticated;
grant execute on function public.articles_marcar_compartido(text) to anon, authenticated;
