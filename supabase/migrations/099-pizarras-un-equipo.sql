-- Pizarras de la comunidad con un solo equipo (30-oct, pedido del dueño): el
-- modo «solo un equipo» de la pizarra también se puede publicar; sin rival,
-- las tres columnas del visitante quedan a null.
alter table public.pizarras alter column visitante_id drop not null;
alter table public.pizarras alter column visitante_nombre drop not null;
alter table public.pizarras alter column visitante_logo drop not null;
