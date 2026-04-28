-- Donations table — tracks one-shot voluntary contributions to support the
-- site. Run this once in the Supabase SQL Editor (Dashboard → SQL Editor →
-- New query → paste → Run).

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'pending',
  message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists donations_user_id_idx on public.donations(user_id);
create index if not exists donations_status_idx on public.donations(status);

alter table public.donations enable row level security;

drop policy if exists "Users see their own donations" on public.donations;
create policy "Users see their own donations"
  on public.donations for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts and updates are done from the server with the service role,
-- so no policy is needed for those operations from authenticated users.
