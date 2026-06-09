import Link from "next/link";
import { stripe } from "@/lib/stripe/server";

export const metadata = {
  title: "¡Gracias! | Soy Reinaldo",
  description: "Gracias por apoyar el proyecto.",
};

export default async function DonacionExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let amountEur: number | null = null;
  let donorName: string | null = null;

  // Página SOLO de display: el registro en BD lo hace el webhook de Stripe
  // (/api/stripe/webhook), que es la fuente canónica con reintentos. Aquí solo
  // leemos la sesión para mostrar el importe y el nombre — sin escribir nada,
  // así evitamos la doble escritura y sus condiciones de carrera.
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" && session.amount_total) {
        amountEur = session.amount_total / 100;
        donorName =
          session.customer_details?.name ??
          session.customer_details?.email?.split("@")[0] ??
          null;
      }
    } catch {
      // Stripe couldn't find the session — fall through to the generic page.
    }
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="statecard">
            <div className="stateicon">❤️</div>
            <h1>{donorName ? `Gracias, ${donorName}` : "¡Gracias!"}</h1>
            <p>
              {amountEur !== null
                ? `Tu donación de ${amountEur.toLocaleString("es-ES", { maximumFractionDigits: 2 })}€ ya está confirmada.`
                : "Tu donación está siendo procesada."}{" "}
              Apoyos como el tuyo son los que hacen que este proyecto siga vivo.
            </p>

            <div
              className="flex flex-col gap-3 sm:flex-row sm:justify-center"
              style={{ marginTop: 28 }}
            >
              <Link href="/" className="btn btn--accent justify-center">
                Volver al inicio
              </Link>
              <Link href="/quiniela" className="btn btn--ghost justify-center">
                Ir a la quiniela
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
