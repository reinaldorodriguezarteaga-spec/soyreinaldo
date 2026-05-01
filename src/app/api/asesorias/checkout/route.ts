import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  return `${proto}://${host}`;
}

/**
 * Crea una Stripe Checkout Session para la Asesoría 1:1 (75€).
 * Tras pagar, Stripe redirige a /asesorias/agendar?session_id={CHECKOUT_SESSION_ID}
 * donde validamos el pago y embebemos Cal.com.
 */
export async function POST() {
  const priceId = process.env.STRIPE_ASESORIA_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_ASESORIA_PRICE_ID missing" },
      { status: 500 },
    );
  }

  const origin = await siteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/asesorias/agendar?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/asesorias?cancelled=1`,
    metadata: { type: "asesoria_1on1" },
    // Permitir que Stripe recoja el email para tener referencia incluso si
    // luego se pierde la pestaña entre pago y agendar
    customer_creation: "always",
  });

  return NextResponse.json({ url: session.url });
}
