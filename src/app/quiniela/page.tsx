import Link from "next/link";

export const metadata = {
  title: "Quiniela Mundial 2026 | Soy Reinaldo",
  description:
    "Quiniela del Mundial FIFA 2026 con la comunidad de Fútbol con Reinaldo.",
};

export default function QuinielaPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Quiniela Mundial 2026
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Estamos montando la quiniela para que la disfrutemos todos durante el
          Mundial. Lanzamiento previsto: 11 de junio de 2026.
        </p>
        <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Próximamente: registro, pronósticos por fase, ranking en vivo y
          resultados sincronizados con la API oficial.
        </div>
      </div>
    </main>
  );
}
