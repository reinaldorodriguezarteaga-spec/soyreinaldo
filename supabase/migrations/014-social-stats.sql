-- =============================================================================
-- Stats de redes sociales (1 fila, editable desde /admin/seguidores)
-- =============================================================================
-- En lugar de hardcodear números en código y desplegar, los números viven en
-- DB y se actualizan desde un form de admin. Toda la web lee de aquí.
--
-- Guardamos como texto (no int) porque los formatos varían ("54,5K", "+7,7M",
-- "+9.000") y queremos respetar exactamente lo que el admin teclea — sin
-- forzar conversiones ni cálculos del lado del servidor.
-- =============================================================================

create table if not exists public.social_stats (
  id smallint primary key default 1 check (id = 1),
  ig_followers text not null default '54,5K',
  ig_views_monthly text not null default '+7,7M',
  fb_followers text not null default '43K',
  fb_views_monthly text not null default '+8,4M',
  tt_followers text not null default '34,4K',
  tt_views_monthly text not null default '+4M',
  yt_subscribers text not null default '+9.000',
  yt_views_monthly text not null default '+1,8M',
  threads_followers text not null default '8,7K',
  total_followers text not null default '+149.000',
  updated_at timestamptz not null default now()
);

-- Insertar la única fila si aún no existe
insert into public.social_stats (id)
values (1)
on conflict (id) do nothing;

-- RLS: lectura pública (todos los visitantes ven los números), escritura
-- solo admin (validado en server action; aquí garantizamos doble capa).
alter table public.social_stats enable row level security;

drop policy if exists "social_stats_select_public" on public.social_stats;
create policy "social_stats_select_public"
  on public.social_stats for select
  to anon, authenticated using (true);

drop policy if exists "social_stats_update_admin" on public.social_stats;
create policy "social_stats_update_admin"
  on public.social_stats for update
  to authenticated using (public.is_admin()) with check (public.is_admin());
