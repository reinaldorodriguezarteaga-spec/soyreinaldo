import Link from "next/link";
import { stripe } from "@/lib/stripe/server";

export const metadata = {
  title: "Agendar tu asesoría | Soy Reinaldo",
};

const CAL_USERNAME = "reinaldo-rodriguez-gv2402";

/**
 * Página post-pago. Verifica que el `session_id` corresponde a un pago real
 * y no expirado, y embebe Cal.com para que el usuario reserve día/hora.
 *
 * Nota: solo validamos `payment_status === "paid"`. No marcamos como
 * "redeemed" en BD porque Cal.com hace el booking del lado de Cal y aún si
 * recargan la página podrán seguir viendo el calendario hasta que reserven.
 */
export default async function AgendarPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return <Invalid reason="Falta la referencia de pago." />;
  }

  let paid = false;
  let customerEmail: string | null = null;
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    paid = session.payment_status === "paid";
    customerEmail = session.customer_details?.email ?? null;
  } catch {
    return <Invalid reason="No encontramos esa sesión de pago." />;
  }

  if (!paid) {
    return (
      <Invalid reason="El pago aún no se ha confirmado. Si lo acabas de hacer, recarga la página en unos segundos." />
    );
  }

  // Cal.com embed con prefill del email
  const embedUrl = new URL(`https://cal.com/${CAL_USERNAME}`);
  if (customerEmail) embedUrl.searchParams.set("email", customerEmail);
  embedUrl.searchParams.set("embed", "true");

  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Inicio
        </Link>

        <header className="mt-8 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            ✓ Pago confirmado
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Elige <span className="text-indigo-300">día y hora</span>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Selecciona un hueco que te encaje. Recibirás email de confirmación
            con el link de la videollamada y podrás cambiar la cita hasta 24h
            antes.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <iframe
            src={embedUrl.toString()}
            title="Calendario de reserva"
            className="h-[700px] w-full bg-white"
            allow="camera; microphone; fullscreen; clipboard-write"
          />
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          ¿Problemas con el calendario?{" "}
          <Link
            href="/contacto"
            className="text-indigo-300 hover:text-indigo-200"
          >
            Escríbeme con tu referencia de pago
          </Link>{" "}
          y lo agendamos a mano.
        </p>
        <p className="mt-2 text-[10px] text-zinc-600">
          Referencia: <span className="font-mono">{session_id.slice(0, 20)}…</span>
        </p>
      </div>
    </main>
  );
}

function Invalid({ reason }: { reason: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-sm text-red-200">
          <p className="font-semibold">No se puede agendar todavía.</p>
          <p className="mt-2 leading-relaxed text-red-200/80">{reason}</p>
        </div>
        <Link
          href="/asesorias"
          className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          ← Volver a la asesoría
        </Link>
      </div>
    </main>
  );
}
