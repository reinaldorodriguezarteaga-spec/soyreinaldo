-- =============================================================================
-- Widget «Clasificación» de la app (4-nov-2026)
-- =============================================================================
-- El widget del iPhone no tiene la sesión de la web: la app le guarda una
-- llave propia de cada usuario (un uuid aleatorio) y el widget pide con ella
-- su puesto (/api/widget/clasificacion?t=). La llave solo deja ver eso; no
-- abre sesión ni toca nada. Va en tabla aparte porque `profiles` la lee
-- cualquier usuario con sesión.
--
-- Idempotente.
-- =============================================================================

create table if not exists public.widget_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  creado timestamptz not null default now()
);

alter table public.widget_tokens enable row level security;
-- Sin políticas: solo el servidor (service role) la lee y la escribe.
