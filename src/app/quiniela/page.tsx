import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Quiniela Mundial 2026 | Soy Reinaldo",
  description:
    "Quiniela del Mundial FIFA 2026 con la comunidad de Fútbol con Reinaldo.",
};

export default async function QuinielaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "amigo";

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Mundial 2026 · 11 jun – 19 jul
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Hola, <span className="text-indigo-300">{displayName}</span>.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Estás dentro de la quiniela. La fase de pronósticos abrirá cuando
            cargue el calendario oficial del Mundial.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-8">
          <p className="text-xs uppercase tracking-widest text-indigo-300">
            En construcción
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-300">
            <li>· Calendario completo (48 partidos de fase de grupos)</li>
            <li>· Pronósticos de cada partido (resultado exacto)</li>
            <li>· Pick de Campeón del Mundial (20 puntos)</li>
            <li>· Pick de Pichichi del Mundial (10 + 5 puntos)</li>
            <li>· Ranking en vivo durante el torneo</li>
          </ul>
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
          <p className="font-medium text-white">Reglas del juego</p>
          <ul className="mt-3 space-y-1.5">
            <li>· Resultado exacto del partido — 3 puntos</li>
            <li>· Solo ganador / empate — 1 punto</li>
            <li>· Acertar el campeón del Mundial — 20 puntos</li>
            <li>· Acertar el Pichichi — 10 puntos</li>
            <li>· Acertar también sus goles exactos — 5 puntos extra</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
