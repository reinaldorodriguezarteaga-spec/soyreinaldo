-- =============================================================================
-- Análisis: la voz de Reinaldo dentro de la web
-- =============================================================================
-- Hasta ahora no había NI UNA palabra propia en soyreinaldo.com. Los datos de
-- fútbol están en veinte sitios y siempre habrá quien los tenga mejores; lo
-- que no puede copiar nadie es el criterio de quien escribe. Además su opinión
-- vivía entera en Instagram: no posiciona en Google y no es suya.
--
-- Un análisis puede engancharse a un partido (aparece en su ficha, que es
-- donde aterriza la gente desde Google) y SIEMPRE tiene página propia, que es
-- lo que rankea por sí solo.
-- =============================================================================

create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  /** Entradilla: se usa en las tarjetas y como descripción para buscadores. */
  excerpt       text,
  /** Cuerpo en Markdown. */
  body          text not null default '',
  cover_url     text,
  /** Enganches opcionales. Un análisis puede no ser de ningún partido
   * concreto (un fichaje, una temporada) y seguir teniendo sentido. */
  fixture_id        int,
  competition_slug  text,
  team_id           int,
  /** null = borrador. Se publica poniendo fecha. */
  published_at  timestamptz,
  author_id     uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_articles_publicados
  on public.articles (published_at desc) where published_at is not null;
create index if not exists idx_articles_fixture
  on public.articles (fixture_id) where fixture_id is not null;

alter table public.articles enable row level security;

-- Los publicados los lee cualquiera, incluso sin cuenta: son el gancho.
drop policy if exists articles_lectura_publica on public.articles;
create policy articles_lectura_publica on public.articles
  for select using (published_at is not null and published_at <= now());

-- Los borradores y la escritura, solo el admin del sitio.
drop policy if exists articles_admin on public.articles;
create policy articles_admin on public.articles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles
  for each row execute function public.lq_touch_updated_at();
