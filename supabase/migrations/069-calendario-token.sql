-- Calendario de "Mis equipos" (16-oct): enlace secreto por persona para
-- suscribirse desde Google Calendar / iPhone. Las apps de calendario no
-- mandan cookies, así que el enlace lleva su propio token (distinto del de
-- darse de baja de los correos: se comparte con otra app).

alter table public.profiles
  add column if not exists calendario_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_calendario_token_key
  on public.profiles (calendario_token);
