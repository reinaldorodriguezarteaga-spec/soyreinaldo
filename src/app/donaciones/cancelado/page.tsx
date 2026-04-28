import Link from "next/link";

export const metadata = {
  title: "Donación cancelada | Soy Reinaldo",
  description: "Has cancelado la donación.",
};

export default function DonacionCanceladaPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Sin problema.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          La donación se ha cancelado y no se ha cobrado nada. Si quieres,
          puedes intentarlo de nuevo cuando te apetezca.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
