-- =============================================================================
-- Tabla de donaciones (que el código ya intentaba usar pero no existía)
-- =============================================================================
-- La página /donaciones/exito tenía un upsert a public.donations que fallaba
-- silenciosamente porque la tabla no existía. Stripe sí cobraba, pero
-- internamente no quedaba registro de quién había donado.
-- =============================================================================

create table if not exists public.donations (
  stripe_checkout_session_id text primary key,
  stripe_payment_intent_id text,
  amount_cents int not null,
  currency text not null default 'eur',
  status text not null default 'succeeded',
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_donations_completed_at
  on public.donations(completed_at desc);
create index if not exists idx_donations_user
  on public.donations(user_id)
  where user_id is not null;

-- Solo el admin lee desde la app. Los inserts vienen del backend con service
-- role tras verificar el pago contra Stripe, así que no necesitamos policy
-- de INSERT para usuarios — service role bypasea RLS.
alter table public.donations enable row level security;

drop policy if exists "donations_select_admin" on public.donations;
create policy "donations_select_admin"
  on public.donations for select
  to authenticated using (public.is_admin());
