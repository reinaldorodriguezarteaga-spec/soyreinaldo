-- Permitir favoritos de tipo 'player' además de 'competition' y 'team'.
-- Ya aplicada en la BD el 2026-08-03 vía MCP.
alter table public.user_favorites drop constraint if exists user_favorites_kind_check;
alter table public.user_favorites add constraint user_favorites_kind_check
  check (kind = any (array['competition'::text, 'team'::text, 'player'::text]));
