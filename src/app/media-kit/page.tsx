import Link from "next/link";

export const metadata = {
  title: "Media Kit | Soy Reinaldo",
  description:
    "Media kit de Reinaldo Rodríguez — audiencia, formatos y contacto para marcas.",
};

export default function MediaKitPage() {
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
          Media kit
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Próximamente. Aquí podrás descargar mi media kit con datos de
          audiencia, formatos disponibles y casos de éxito.
        </p>
      </div>
    </main>
  );
}
