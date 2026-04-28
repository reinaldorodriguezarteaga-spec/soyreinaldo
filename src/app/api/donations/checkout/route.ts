import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";

const MIN_CENTS = 100; // 1€
const MAX_CENTS = 50000; // 500€ — sane cap, prevents accidental typos

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  let body: { amountCents?: number; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const amountCents = Number(body.amountCents);
  if (!Number.isFinite(amountCents) || amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return NextResponse.json(
      { error: `El importe debe estar entre 1€ y 500€.` },
      { status: 400 },
    );
  }

  const message = (body.message ?? "").toString().slice(0, 280) || null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = await siteOrigin();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "Apoyo a Soy Reinaldo",
            description:
              "Donación voluntaria para mantener la web y el contenido.",
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: user?.email ?? undefined,
    metadata: {
      user_id: user?.id ?? "",
      message: message ?? "",
    },
    success_url: `${origin}/donaciones/exito?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/donaciones/cancelado`,
  });

  return NextResponse.json({ url: session.url });
}
