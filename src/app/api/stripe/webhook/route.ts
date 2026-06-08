import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe — la fuente CANÓNICA de verdad para los pagos.
 *
 * A diferencia de las páginas de éxito (que dependen de que el usuario vuelva
 * al sitio tras pagar), este endpoint lo llama Stripe directamente en cuanto
 * el pago se confirma, así que nunca se pierde un registro aunque el usuario
 * cierre la pestaña.
 *
 * Eventos manejados:
 *   - checkout.session.completed → registra donación o asesoría según
 *     `metadata.type`.
 *
 * Seguridad:
 *   - Verifica la firma con STRIPE_WEBHOOK_SECRET. Sin firma válida → 400.
 *   - Idempotente: upsert por PK (stripe_checkout_session_id). Stripe puede
 *     reenviar el mismo evento varias veces; no se duplica.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("Stripe webhook: missing env vars");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  // El cuerpo CRUDO es imprescindible para verificar la firma — no parsear.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error(
      "Stripe webhook signature verification failed:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Reconocemos el evento aunque no lo procesemos, para que Stripe no
    // reintente indefinidamente.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Solo registramos pagos efectivamente completados.
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true, unpaid: true });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const isAsesoria = session.metadata?.type === "asesoria_1on1";

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    if (isAsesoria) {
      const { error } = await supabase.from("consultations").upsert(
        {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: "succeeded",
          user_id: session.metadata?.user_id || null,
          email: session.customer_details?.email ?? null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "stripe_checkout_session_id" },
      );
      if (error) throw error;
    } else {
      const { error } = await supabase.from("donations").upsert(
        {
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: paymentIntentId,
          amount_cents: session.amount_total ?? 0,
          currency: session.currency ?? "eur",
          status: "succeeded",
          user_id: session.metadata?.user_id || null,
          email: session.customer_details?.email ?? null,
          message: session.metadata?.message || null,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "stripe_checkout_session_id" },
      );
      if (error) throw error;
    }
  } catch (e) {
    console.error("Stripe webhook DB write failed:", e);
    // 500 → Stripe reintentará el evento más tarde (es idempotente).
    return NextResponse.json({ error: "DB write failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
