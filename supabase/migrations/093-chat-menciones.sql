-- Menciones en el chat de la quiniela (27-oct, pedido del dueño: «así las
-- personas saben que se habla con ellos»). Se guardan por id —la mitad de
-- los miembros no tiene nombre de usuario— y el servidor solo acepta
-- miembros de la liga cuyo «@nombre» está en el texto.
alter table public.lq_chat add column if not exists menciones uuid[] not null default '{}';
