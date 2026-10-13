-- 062 · Boletín semanal (13-oct-2026).
--
-- Una fila por edición (semana ISO, "2026-W42") y destinatario: así un
-- envío cortado a medias (límite diario de correos) se retoma sin repetir a
-- nadie. El cron NO se programa aquí: se activa cuando el dueño apruebe el
-- correo de prueba (ver /api/cron/boletin).

create table if not exists public.boletin_envios (
  edicion text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  enviado_at timestamptz not null default now(),
  primary key (edicion, user_id)
);
alter table public.boletin_envios enable row level security;
-- Sin políticas: solo la service role (el cron) la toca.
