-- =============================================================================
-- Username + número de teléfono en profiles
-- =============================================================================
-- Username:
--   - 3 a 15 caracteres
--   - solo a-z, 0-9, _, -, .
--   - case-insensitive (siempre se guarda en minúsculas vía trigger)
--   - único
-- Teléfono:
--   - opcional
--   - formato E.164 (+34..., +52...)
-- =============================================================================

alter table public.profiles
  add column if not exists username text,
  add column if not exists phone_number text;

-- Único (case-insensitive porque siempre normalizamos a lower)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'profiles_username_key'
  ) then
    create unique index profiles_username_key
      on public.profiles (username);
  end if;
end$$;

-- Constraints (drop primero por idempotencia)
alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9._-]{3,15}$'
  );

alter table public.profiles
  drop constraint if exists profiles_phone_format;
alter table public.profiles
  add constraint profiles_phone_format check (
    phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$'
  );

-- Trigger: normaliza username a lower siempre antes de insertar/actualizar
create or replace function public.normalize_username()
returns trigger language plpgsql as $$
begin
  if new.username is not null then
    new.username := lower(trim(new.username));
    if new.username = '' then
      new.username := null;
    end if;
  end if;
  if new.phone_number is not null then
    new.phone_number := trim(new.phone_number);
    if new.phone_number = '' then
      new.phone_number := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_normalize_username on public.profiles;
create trigger trg_normalize_username
  before insert or update of username, phone_number on public.profiles
  for each row execute function public.normalize_username();

-- Auto-create profile en signup ahora también lee username y phone_number de
-- raw_user_meta_data (si los pasamos en supabase.auth.signUp options.data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, username, phone_number)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1)
    ),
    nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone_number', '')), '')
  );
  return new;
end;
$$;

-- RPC público (security definer) para resolver username -> email a la hora del
-- login. No expone más que el email asociado a un username. Devuelve null si
-- no existe.
create or replace function public.lookup_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select au.email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.username = lower(trim(p_username))
  limit 1;
$$;

grant execute on function public.lookup_email_by_username(text) to anon, authenticated;
