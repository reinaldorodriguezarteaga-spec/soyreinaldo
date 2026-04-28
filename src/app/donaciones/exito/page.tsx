import Link from "next/link";
import { stripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

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

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid" && session.amount_total) {
        amountEur = session.amount_total / 100;
        donorName =
          session.customer_details?.name ??
          session.customer_details?.email?.split("@")[0] ??
          null;

        // Persist the donation if we don't have it yet. Idempotent thanks
        // to the unique index on stripe_checkout_session_id.
        const supabase = await createClient();
        await supabase.from("donations").upsert(
          {
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
            amount_cents: session.amount_total,
            currency: session.currency ?? "eur",
            status: "succeeded",
            user_id: session.metadata?.user_id || null,
            email: session.customer_details?.email ?? null,
            message: session.metadata?.message || null,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "stripe_checkout_session_id" },
        );
      }
    } catch {
      // Stripe couldn't find the session — fall through to the generic page.
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-300/15 text-3xl">
          ❤️
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {donorName ? `Gracias, ${donorName}` : "¡Gracias!"}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-400">
          {amountEur !== null
            ? `Tu donación de ${amountEur.toLocaleString("es-ES", { maximumFractionDigits: 2 })}€ ya está confirmada.`
            : "Tu donación está siendo procesada."}{" "}
          Apoyos como el tuyo son los que hacen que este proyecto siga vivo.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-xl bg-indigo-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Volver al inicio
          </Link>
          <Link
            href="/quiniela"
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
          >
            Ir a la quiniela
          </Link>
        </div>
      </div>
    </main>
  );
}
