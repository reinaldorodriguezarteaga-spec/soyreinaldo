import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Monedero | Soy Reinaldo",
  description:
    "Tu monedero para futuras inscripciones, premios y movimientos.",
};

export default async function MonederoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/monedero");

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Cuenta
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tu <span className="text-indigo-300">monedero</span>.
          </h1>
          <p className="mt-6 text-base leading-relaxed text-zinc-400">
            Aquí verás tus saldos, inscripciones y movimientos cuando arranquen
            quinielas con bote.
          </p>
        </header>

        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 p-8">
          <p className="text-xs uppercase tracking-widest text-indigo-300">
            En construcción
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            La quiniela del Mundial 2026 arranca como gratuita. Cuando abramos
            quinielas con bote (Champions, Liga, etc.) este será tu sitio para
            ver saldo, depósitos y premios cobrados.
          </p>
        </div>
      </div>
    </main>
  );
}
