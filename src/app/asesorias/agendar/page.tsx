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
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">✓ Pago confirmado</p>
          <h1 className="phero__title">
            Elige <span style={{ color: "var(--accent)" }}>día y hora</span>
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Selecciona un hueco que te encaje. Recibirás email de confirmación
            con el link de la videollamada y podrás cambiar la cita hasta 24h
            antes.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div
            className="panel"
            style={{ overflow: "hidden" }}
          >
            <iframe
              src={embedUrl.toString()}
              title="Calendario de reserva"
              className="h-[700px] w-full bg-white"
              allow="camera; microphone; fullscreen; clipboard-write"
            />
          </div>

          <p className="hint" style={{ marginTop: 24 }}>
            ¿Problemas con el calendario?{" "}
            <Link href="/contacto" style={{ color: "var(--accent)" }}>
              Escríbeme con tu referencia de pago
            </Link>{" "}
            y lo agendamos a mano.
          </p>
          <p className="mono" style={{ marginTop: 8, color: "var(--text-dim)" }}>
            Referencia: {session_id.slice(0, 20)}…
          </p>
        </div>
      </section>
    </main>
  );
}

function Invalid({ reason }: { reason: string }) {
  return (
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="statecard" style={{ textAlign: "left" }}>
            <div className="notice notice--err">
              <p style={{ fontWeight: 700, margin: 0 }}>
                No se puede agendar todavía.
              </p>
              <p style={{ margin: "8px 0 0" }}>{reason}</p>
            </div>
            <Link
              href="/asesorias"
              className="mono"
              style={{
                display: "inline-block",
                marginTop: 24,
                color: "var(--text-dim)",
              }}
            >
              ← Volver a la asesoría
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
