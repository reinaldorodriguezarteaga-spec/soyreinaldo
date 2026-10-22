import { exigirSeccion, PERMISOS, type Permiso } from "@/lib/permisos";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import { DarPermiso, QuitarPermiso } from "./formulario";

export const metadata = { title: "Permisos | Admin" };

/** Permisos por sección (migración 087): quién puede escribir análisis o usar
 * el descargador de imágenes sin ser admin de todo. Solo para el admin. */
export default async function AdminPermisosPage() {
  await exigirSeccion("admin");
  const db = clienteServicio();
  const { data } = db
    ? await db
        .from("profiles")
        .select("id, username, display_name, permisos")
        .neq("permisos", "{}")
        .order("username")
        .returns<{ id: string; username: string | null; display_name: string | null; permisos: string[] }[]>()
    : { data: [] };
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold">Permisos</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Da a un usuario acceso a una sola sección del panel, sin hacerlo admin. Solo ve lo que le das.
          </p>
        </div>
        <DarPermiso />
        <div>
          <h2 className="mb-3 text-lg font-semibold">Con permisos</h2>
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-zinc-400">Nadie todavía.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(data ?? []).map((u) => (
                <li key={u.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-800 px-3 py-2 text-sm">
                  <b>{u.username || u.display_name || "—"}</b>
                  <span className="text-zinc-500">{u.display_name}</span>
                  <span className="ml-auto flex flex-wrap gap-1">
                    {u.permisos
                      .filter((p): p is Permiso => p in PERMISOS)
                      .map((p) => (
                        <QuitarPermiso key={p} usuario={u.username || u.display_name || ""} permiso={p} />
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
