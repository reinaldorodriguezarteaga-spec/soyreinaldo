import Link from "next/link";
import { getSocialStats } from "@/lib/social-stats";
import StatsForm from "./stats-form";

export const metadata = {
  title: "Seguidores | Admin | Soy Reinaldo",
};

export default async function AdminSocialStatsPage() {
  const stats = await getSocialStats();
  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/admin/ligas"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Admin
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Admin · Redes sociales
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Cifras de seguidores
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Estos números se muestran en home, /redes, /contacto y /media-kit.
            Cambia lo que quieras y pulsa guardar — la web se actualiza
            inmediatamente en todos los sitios.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            Última actualización:{" "}
            <span className="text-zinc-300">
              {new Date(stats.updated_at).toLocaleString("es-ES", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          </p>
        </header>

        <StatsForm initial={stats} />
      </div>
    </main>
  );
}
