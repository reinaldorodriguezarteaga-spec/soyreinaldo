import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { accesoActual, puede, type Seccion } from "@/lib/permisos";

export const metadata = {
  title: "Admin | Soy Reinaldo",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/ligas");
  }

  // Admin, o alguien con permiso para alguna sección (migración 087): cada
  // página comprueba la suya con exigirSeccion().
  const acceso = await accesoActual();
  if (!acceso || (!acceso.admin && acceso.permisos.length === 0)) {
    redirect("/");
  }
  const admin = acceso.admin;
  const ve = (s: Seccion) => puede(acceso, s);

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-900 bg-zinc-950/40">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-xs">
          <span className="rounded-full bg-indigo-300/10 px-2.5 py-0.5 font-medium uppercase tracking-[0.2em] text-indigo-300">
            Admin
          </span>
          <nav className="flex flex-wrap gap-3 text-zinc-400">
            {ve("analisis") && (
              <Link href="/admin/analisis" className="hover:text-white">
                Escribir
              </Link>
            )}
            {admin && (
              <>
                <Link href="/admin/ligas" className="hover:text-white">
                  Ligas
                </Link>
                <Link href="/admin/quiniela-liga" className="hover:text-white">
                  Final Quiniela LaLiga
                </Link>
                <Link href="/admin/metricas" className="hover:text-white">
                  Métricas
                </Link>
                <Link href="/admin/seguidores" className="hover:text-white">
                  Redes
                </Link>
              </>
            )}
            {ve("imagenes") && (
              <Link href="/admin/imagenes" className="hover:text-white">
                Imágenes
              </Link>
            )}
            {admin && (
              <>
                <Link href="/admin/permisos" className="hover:text-white">
                  Permisos
                </Link>
                {/* Marcador completo del Multichat (fuente de navegador en OBS):
                    enlace externo, por eso <a> y no <Link>. */}
                <a href="https://chat.soyreinaldo.com/marcador/completo" target="_blank" rel="noreferrer" className="hover:text-white">
                  Marcador completo ↗
                </a>
              </>
            )}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
