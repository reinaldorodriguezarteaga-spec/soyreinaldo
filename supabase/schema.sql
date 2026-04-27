-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run)
-- Phase 1: profiles + auto-create on signup. Tournament tables (matches, predictions, picks)
-- come in a separate migration.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz default now()
);

-- When a new auth user is created, mirror it in profiles using the email prefix
-- as a default display name (the user can change it later).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "Profiles visible to authenticated" on public.profiles;
create policy "Profiles visible to authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);
