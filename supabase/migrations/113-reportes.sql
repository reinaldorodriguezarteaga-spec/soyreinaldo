-- =============================================================================
-- «Reportar un fallo» (5-nov-2026, pedido del dueño)
-- =============================================================================
-- Botón en todas las páginas (pie) y junto a los números de las fichas para
-- avisar de un dato mal (goles de un jugador, un resultado…) o de un error de
-- la web. Se guarda la página exacta, quién (si hay sesión) y el navegador; al
-- dueño le llega un aviso al móvil y lo revisa en /admin/reportes.
--
-- Solo el servidor escribe y lee (service role): RLS sin políticas. El freno
-- antiabuso va por huella de IP (hash, nunca la IP en claro).
-- Idempotente.
-- =============================================================================

create table if not exists public.reportes (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  tipo text not null default 'dato' check (tipo in ('dato', 'fallo', 'otro')),
  texto text not null check (char_length(texto) between 3 and 2000),
  url text not null,
  contexto text,
  contacto text,
  user_id uuid references auth.users (id) on delete set null,
  navegador text,
  ip_hash text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'revisado', 'arreglado', 'descartado'))
);
create index if not exists reportes_estado on public.reportes (estado, creado desc);
create index if not exists reportes_ip on public.reportes (ip_hash, creado desc);
alter table public.reportes enable row level security;
