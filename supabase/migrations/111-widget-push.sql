-- =============================================================================
-- Widget del marcador al día por push (4-nov-2026, pedido del dueño)
-- =============================================================================
-- iOS raciona las recargas de un widget (unas 40-70 al día): en pleno partido
-- el marcador se quedaba congelado. Desde iOS 26 el servidor puede pedirle al
-- iPhone que recargue el widget con un aviso silencioso (APNs, push-type
-- «widgets»). La extensión del widget manda aquí su token (no es de ningún
-- usuario: el widget del marcador es igual para todos) y la ingesta en vivo
-- avisa cuando hay gol o cambia el estado de un partido del Barça o del Madrid.
--
-- Solo el servidor (service role) lee y escribe: sin políticas.
-- Idempotente.
-- =============================================================================

create table if not exists public.widget_push_tokens (
  token text primary key,
  entorno text not null default 'production' check (entorno in ('production', 'sandbox')),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

alter table public.widget_push_tokens enable row level security;
