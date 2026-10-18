-- Penaltis en Messi vs Cristiano (18-oct, pedido del dueño): marcados y
-- fallados de carrera. Base de Transfermarkt (club y selección, partidos
-- oficiales, sin tandas) a 18-oct-2026; desde ahí, el cron `goats` suma los
-- de cada partido nuevo. Los partidos ya apuntados quedan en 0: ninguno tuvo
-- penalti y la base ya los incluye.
alter table public.goat_base
  add column if not exists pen_marcados int not null default 0,
  add column if not exists pen_fallados int not null default 0;
alter table public.goat_partidos
  add column if not exists pen_marcados int not null default 0,
  add column if not exists pen_fallados int not null default 0;

update public.goat_base set pen_marcados = 117, pen_fallados = 35 where jugador = 'messi';
update public.goat_base set pen_marcados = 183, pen_fallados = 36 where jugador = 'ronaldo';
