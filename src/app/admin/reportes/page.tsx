import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { exigirSeccion } from "@/lib/permisos";
import { marcarReporte, type EstadoReporte } from "./actions";

export const metadata = { title: "Reportes | Admin | Soy Reinaldo" };
export const dynamic = "force-dynamic";

type Reporte = {
  id: number;
  creado: string;
  tipo: "dato" | "fallo" | "otro";
  texto: string;
  url: string;
  contexto: string | null;
  contacto: string | null;
  navegador: string | null;
  estado: EstadoReporte;
  perfil: { username: string | null } | null;
};

const TIPO = { dato: "🔢 Dato mal", fallo: "🐞 Fallo", otro: "📝 Otro" } as const;
const SIGUIENTES: { estado: EstadoReporte; texto: string }[] = [
  { estado: "arreglado", texto: "Arreglado" },
  { estado: "revisado", texto: "Revisado" },
  { estado: "descartado", texto: "Descartar" },
  { estado: "nuevo", texto: "Volver a nuevo" },
];

/** Reportes de «Reportar un fallo» (migración 113, 5-nov). */
export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string }>;
}) {
  await exigirSeccion("admin");
  const { ver } = await searchParams;
  const todos = ver === "todos";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(url, key, { auth: { persistSession: false } });
  let q = db
    .from("reportes")
    .select("id, creado, tipo, texto, url, contexto, contacto, navegador, estado, user_id")
    .order("creado", { ascending: false })
    .limit(200);
  if (!todos) q = q.in("estado", ["nuevo", "revisado"]);
  const { data } = await q;
  const filas = (data ?? []) as (Omit<Reporte, "perfil"> & { user_id: string | null })[];
  const ids = [...new Set(filas.map((f) => f.user_id).filter(Boolean))] as string[];
  const { data: perfiles } = ids.length
    ? await db.from("profiles").select("id, username").in("id", ids)
    : { data: [] };
  const nombre = new Map(((perfiles ?? []) as { id: string; username: string | null }[]).map((p) => [p.id, p.username]));

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/admin/ligas" className="text-sm text-zinc-500 transition hover:text-white">
          ← Admin
        </Link>
        <header className="mt-6 mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Admin · Reportes</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Fallos y datos mal</h1>
          </div>
          <Link href={todos ? "/admin/reportes" : "/admin/reportes?ver=todos"} className="text-sm text-indigo-300 hover:text-white">
            {todos ? "Ver solo pendientes" : "Ver también los cerrados"}
          </Link>
        </header>

        {filas.length === 0 ? (
          <p className="text-zinc-400">No hay reportes {todos ? "" : "pendientes"}. 🎉</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filas.map((r) => (
              <li key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="font-medium text-zinc-200">{TIPO[r.tipo]}</span>
                  <span>·</span>
                  <span>{new Date(r.creado).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Madrid" })}</span>
                  <span>·</span>
                  <span className={r.estado === "nuevo" ? "text-amber-300" : ""}>{r.estado}</span>
                  {r.user_id && (
                    <>
                      <span>·</span>
                      <span>@{nombre.get(r.user_id) ?? "usuario"}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-zinc-100">{r.texto}</p>
                <p className="mt-2 text-sm">
                  <Link href={r.url} className="text-indigo-300 hover:text-white" target="_blank">
                    {r.contexto ?? r.url}
                  </Link>
                  {r.contacto && <span className="text-zinc-400"> · contacto: {r.contacto}</span>}
                </p>
                {r.navegador && <p className="mt-1 truncate text-xs text-zinc-600">{r.navegador}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {SIGUIENTES.filter((s) => s.estado !== r.estado).map((s) => (
                    <form key={s.estado} action={marcarReporte.bind(null, r.id, s.estado)}>
                      <button type="submit" className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-300 hover:text-white">
                        {s.texto}
                      </button>
                    </form>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
