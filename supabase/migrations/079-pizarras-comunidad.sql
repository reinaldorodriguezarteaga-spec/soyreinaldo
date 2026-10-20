-- Pizarras de la comunidad (20-oct, punto 4 del análisis de JLA Tactics
-- Board): cualquiera con cuenta publica su pizarra (el mismo `?p=` del enlace
-- compartido), todos la ven en /pizarra/comunidad, le dan «me gusta» y la
-- abren para hacerla suya. El dueño (admin) puede ocultarlas.
create table if not exists public.pizarras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (char_length(titulo) between 3 and 80),
  local_id int not null,
  local_nombre text not null,
  local_logo text not null,
  visitante_id int not null,
  visitante_nombre text not null,
  visitante_logo text not null,
  partido_id int,
  estado text not null check (char_length(estado) between 10 and 12000),
  oculta boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists pizarras_recientes on public.pizarras (created_at desc) where not oculta;

create table if not exists public.pizarra_likes (
  pizarra_id uuid not null references public.pizarras(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pizarra_id, user_id)
);

alter table public.pizarras enable row level security;
alter table public.pizarra_likes enable row level security;

drop policy if exists pizarras_ver on public.pizarras;
create policy pizarras_ver on public.pizarras for select to anon, authenticated
  using (not oculta or user_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists pizarras_publicar on public.pizarras;
create policy pizarras_publicar on public.pizarras for insert to authenticated
  with check (user_id = auth.uid() and not oculta);
drop policy if exists pizarras_borrar on public.pizarras;
create policy pizarras_borrar on public.pizarras for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
drop policy if exists pizarras_moderar on public.pizarras;
create policy pizarras_moderar on public.pizarras for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists likes_ver on public.pizarra_likes;
create policy likes_ver on public.pizarra_likes for select to anon, authenticated using (true);
drop policy if exists likes_dar on public.pizarra_likes;
create policy likes_dar on public.pizarra_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_quitar on public.pizarra_likes;
create policy likes_quitar on public.pizarra_likes for delete to authenticated using (user_id = auth.uid());

-- Freno contra spam: 20 publicaciones al día por persona.
create or replace function public.pizarras_freno()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.pizarras
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Has llegado al máximo de 20 pizarras al día';
  end if;
  return new;
end $$;
drop trigger if exists pizarras_freno on public.pizarras;
create trigger pizarras_freno before insert on public.pizarras
  for each row execute function public.pizarras_freno();

-- Listado para la galería: con autor, «me gusta» y si el que mira ya le dio.
create or replace function public.pizarras_comunidad(p_orden text default 'recientes', p_limite int default 48)
returns table(
  id uuid, titulo text, local_id int, local_nombre text, local_logo text,
  visitante_id int, visitante_nombre text, visitante_logo text, partido_id int,
  estado text, created_at timestamptz, autor text, likes int, mio boolean, le_gusta boolean
)
language sql stable security definer set search_path = public as $$
  select pz.id, pz.titulo, pz.local_id, pz.local_nombre, pz.local_logo,
         pz.visitante_id, pz.visitante_nombre, pz.visitante_logo, pz.partido_id,
         pz.estado, pz.created_at,
         coalesce(nullif(pr.display_name, ''), pr.username, 'Anónimo') as autor,
         (select count(*) from public.pizarra_likes l where l.pizarra_id = pz.id)::int as likes,
         pz.user_id = auth.uid() as mio,
         exists (select 1 from public.pizarra_likes l where l.pizarra_id = pz.id and l.user_id = auth.uid()) as le_gusta
  from public.pizarras pz
  left join public.profiles pr on pr.id = pz.user_id
  where not pz.oculta
  order by case when p_orden = 'populares'
                then (select count(*) from public.pizarra_likes l where l.pizarra_id = pz.id) end desc nulls last,
           pz.created_at desc
  limit least(greatest(p_limite, 1), 96);
$$;
grant execute on function public.pizarras_comunidad(text, int) to anon, authenticated;
