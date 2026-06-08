-- =============================================================================
-- Tabla de asesorías 1:1 pagadas (paralela a donations)
-- =============================================================================
-- Registra cada pago de asesoría confirmado por Stripe. Igual que donations,
-- los inserts vienen del backend (webhook + página de éxito) con service role
-- tras verificar el pago contra Stripe. Solo el admin lee desde la app.
--
-- `scheduled_at` queda null hasta que el usuario reserve hueco en Cal.com.
-- Hoy no tenemos webhook de Cal.com, así que se rellenará a mano si hace
-- falta; lo importante es no perder el registro del PAGO.
-- =============================================================================

create table if not exists public.consultations (
  stripe_checkout_session_id text primary key,
  stripe_payment_intent_id text,
  amount_cents int not null,
  currency text not null default 'eur',
  status text not null default 'succeeded',
  user_id uuid references auth.users(id) on delete set null,
  email text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_consultations_completed_at
  on public.consultations(completed_at desc);

alter table public.consultations enable row level security;

drop policy if exists "consultations_select_admin" on public.consultations;
create policy "consultations_select_admin"
  on public.consultations for select
  to authenticated using (public.is_admin());
