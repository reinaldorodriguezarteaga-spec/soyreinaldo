-- 22-oct: AGUJERO CERRADO. Los usuarios podían editar su fila de profiles
-- entera, incluida is_admin (privilegio UPDATE de tabla para authenticated y
-- anon + política «Users update own profile»): cualquiera podía hacerse admin
-- con una llamada al API de Supabase. Comprobado: solo el dueño era admin.
-- Ahora el usuario solo puede tocar las columnas de su perfil; is_admin y
-- permisos solo los cambia el servidor (service role).

revoke update on public.profiles from anon, authenticated;
grant update (display_name, username, phone_number, wants_reminders, unsubscribe_token,
              favoritos_elegidos_at, mi_equipo_id, mi_equipo_liga, calendario_token)
  on public.profiles to authenticated;

-- Permisos por sección del panel (pedido del dueño: que alguien pueda usar el
-- descargador de imágenes o escribir análisis sin ser admin de todo).
alter table public.profiles add column if not exists permisos text[] not null default '{}';

create or replace function public.tiene_permiso(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (is_admin or p = any(permisos))
  );
$$;
grant execute on function public.tiene_permiso(text) to authenticated;

-- Análisis: también quien tenga el permiso «analisis».
drop policy if exists articles_admin on public.articles;
create policy articles_admin on public.articles
  for all to authenticated
  using (public.tiene_permiso('analisis')) with check (public.tiene_permiso('analisis'));
