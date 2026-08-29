-- =============================================================================
-- Comentarios en los análisis: el tablón de la gente
-- =============================================================================
-- Los análisis eran de solo lectura: la conversación se quedaba en Instagram.
-- Un tablón de opiniones debajo de cada artículo engancha a la gente al texto
-- (pedido del dueño) y de paso añade contenido propio a la página, que es
-- justo lo que AdSense echó en falta ("contenido de poco valor", 28-ago).
--
-- Escribir exige cuenta; leer puede cualquiera, también sin sesión — las
-- opiniones son parte del contenido de la página. Como `profiles` solo es
-- legible con sesión, la lectura pública va por un RPC SECURITY DEFINER que
-- resuelve los nombres, el mismo patrón que `lq_leaderboard`.
-- =============================================================================

create table if not exists public.article_comments (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.articles(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  -- El límite vive en la BD, no solo en el formulario: nadie puede colar un
  -- testamento por la API con la anon key.
  constraint article_comments_body_len
    check (char_length(btrim(body)) between 1 and 1000)
);

create index if not exists idx_article_comments_articulo
  on public.article_comments (article_id, created_at);

alter table public.article_comments enable row level security;

-- Leer con sesión: los comentarios de cualquier artículo que puedas ver.
-- Se apoya en la RLS de `articles` (publicados para todos, borradores solo
-- admin): si no ves el artículo, el exists no devuelve nada.
drop policy if exists article_comments_lectura on public.article_comments;
create policy article_comments_lectura on public.article_comments
  for select using (
    exists (select 1 from public.articles a where a.id = article_id)
  );

-- Escribir: solo con sesión, en tu nombre y en artículos publicados.
drop policy if exists article_comments_publicar on public.article_comments;
create policy article_comments_publicar on public.article_comments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.articles a
      where a.id = article_id
        and a.published_at is not null
        and a.published_at <= now()
    )
  );

-- Borrar: el autor del comentario, o el admin (moderación).
drop policy if exists article_comments_borrar on public.article_comments;
create policy article_comments_borrar on public.article_comments
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Sin UPDATE a propósito: se borra y se vuelve a escribir. Menos superficie.

-- Listado público con nombres. SECURITY DEFINER para poder leer
-- `profiles.display_name` sin sesión; a cambio, el filtro de "solo artículos
-- publicados" va DENTRO y no depende de la RLS.
create or replace function public.articles_comentarios(p_article_id uuid)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  body text,
  created_at timestamptz
)
language sql stable security definer
set search_path to 'public'
as $$
  select c.id,
         c.user_id,
         coalesce(nullif(p.display_name, ''), p.username, 'Anónimo') as display_name,
         c.body,
         c.created_at
  from public.article_comments c
  left join public.profiles p on p.id = c.user_id
  where c.article_id = p_article_id
    and exists (
      select 1 from public.articles a
      where a.id = p_article_id
        and a.published_at is not null
        and a.published_at <= now()
    )
  order by c.created_at asc
  limit 200;
$$;

grant execute on function public.articles_comentarios(uuid) to anon, authenticated;
