-- Chat de cada quiniela (27-oct, pedido del dueño: «que se genere más
-- interacción entre la gente»). Un chat por liga de clubes, solo para sus
-- miembros, en tiempo real (Realtime respeta la RLS de lectura).
--
-- Escribe solo el servidor (server actions con service role): comprueba
-- que eres miembro, limita el ritmo y filtra el texto. La moderación que
-- piden Apple y Google para contenido de usuarios va desde el principio:
-- borrar (autor, admin de la liga, admin de la web), reportar (con 3
-- reportes el mensaje se oculta solo) y silenciar a alguien (solo para ti).

create table if not exists public.lq_chat (
  id bigserial primary key,
  league_id uuid not null references public.leagues(id) on delete cascade,
  -- null en los mensajes del sistema («🎯 Fulano clavó el exacto»).
  user_id uuid references auth.users(id) on delete set null,
  -- Se guarda el nombre al escribir: así el tiempo real no tiene que buscarlo.
  autor text,
  tipo text not null default 'usuario' check (tipo in ('usuario', 'sistema')),
  texto text not null check (char_length(texto) between 1 and 500),
  oculto boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lq_chat_liga on public.lq_chat (league_id, id desc);
create index if not exists lq_chat_ritmo on public.lq_chat (user_id, created_at desc);

create table if not exists public.lq_chat_reacciones (
  mensaje_id bigint not null references public.lq_chat(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('👍', '😂', '🔥', '😮', '😢', '⚽')),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mensaje_id, user_id, emoji)
);
create index if not exists lq_chat_reacciones_liga on public.lq_chat_reacciones (league_id);

create table if not exists public.lq_chat_reportes (
  mensaje_id bigint not null references public.lq_chat(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mensaje_id, user_id)
);

create table if not exists public.lq_chat_silencios (
  user_id uuid not null references auth.users(id) on delete cascade,
  silenciado uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, silenciado)
);

alter table public.lq_chat enable row level security;
alter table public.lq_chat_reacciones enable row level security;
alter table public.lq_chat_reportes enable row level security;
alter table public.lq_chat_silencios enable row level security;

drop policy if exists lq_chat_lectura on public.lq_chat;
create policy lq_chat_lectura on public.lq_chat for select to authenticated
  using (public.is_league_member(league_id) or public.is_admin());
drop policy if exists lq_chat_reacciones_lectura on public.lq_chat_reacciones;
create policy lq_chat_reacciones_lectura on public.lq_chat_reacciones for select to authenticated
  using (public.is_league_member(league_id) or public.is_admin());
drop policy if exists lq_chat_silencios_propios on public.lq_chat_silencios;
create policy lq_chat_silencios_propios on public.lq_chat_silencios for select to authenticated
  using (user_id = auth.uid());
-- Reportes: solo el servidor (nadie ve quién reportó).

-- Tiempo real: mensajes (nuevos y ocultados) y reacciones.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lq_chat') then
    alter publication supabase_realtime add table public.lq_chat;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lq_chat_reacciones') then
    alter publication supabase_realtime add table public.lq_chat_reacciones;
  end if;
end $$;
-- Para que el borrado de una reacción llegue con su liga (filtro del canal).
alter table public.lq_chat_reacciones replica identity full;
