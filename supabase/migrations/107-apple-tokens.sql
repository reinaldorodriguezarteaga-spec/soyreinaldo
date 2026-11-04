-- =============================================================================
-- Sign in with Apple en la app 1.1 (4-nov-2026): tokens para poder revocar
-- =============================================================================
-- Apple exige que, al borrar la cuenta, la app revoque el acceso de quien
-- entró con Apple (norma 5.1.1(v), API /auth/revoke). Para eso hace falta el
-- refresh token que Apple da al canjear el código de autorización del primer
-- inicio de sesión: se guarda aquí y solo lo lee el servidor (service role).
-- La fila se borra sola con el usuario (cascade), después de revocar.
--
-- Idempotente.
-- =============================================================================

create table if not exists public.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  actualizado timestamptz not null default now()
);

alter table public.apple_tokens enable row level security;
-- Sin políticas: ni anon ni authenticated la pueden leer ni escribir.
