-- =============================================================================
-- Endurecimiento de las tablas de pagos (auditoría + integridad)
-- =============================================================================
-- Hallazgos de la revisión adversarial del webhook:
--   - Falta updated_at para auditar escrituras.
--   - Falta CHECK que rechace importes no positivos.
-- =============================================================================

alter table public.donations
  add column if not exists updated_at timestamptz not null default now();
alter table public.consultations
  add column if not exists updated_at timestamptz not null default now();

-- Importes siempre positivos (Stripe mínimo es 50 céntimos; nunca 0/negativo).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'donations_amount_positive'
  ) then
    alter table public.donations
      add constraint donations_amount_positive check (amount_cents > 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'consultations_amount_positive'
  ) then
    alter table public.consultations
      add constraint consultations_amount_positive check (amount_cents > 0);
  end if;
end $$;

-- Trigger que mantiene updated_at en cada UPDATE
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists donations_touch_updated_at on public.donations;
create trigger donations_touch_updated_at
  before update on public.donations
  for each row execute function public.touch_updated_at();

drop trigger if exists consultations_touch_updated_at on public.consultations;
create trigger consultations_touch_updated_at
  before update on public.consultations
  for each row execute function public.touch_updated_at();
