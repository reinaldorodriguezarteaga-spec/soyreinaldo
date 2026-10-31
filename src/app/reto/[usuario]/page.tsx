import { Swords } from "lucide-react";
import Icono from "@/components/Icono";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cargarInvitacion } from "@/lib/quiniela-liga/invitacion";
import { T } from "@/components/EnApp";
import AceptarInvitacion from "./aceptar";

type P = { params: Promise<{ usuario: string }>; searchParams: Promise<{ liga?: string }> };

export async function generateMetadata({ params, searchParams }: P): Promise<Metadata> {
  const inv = await cargarInvitacion(decodeURIComponent((await params).usuario), (await searchParams).liga);
  if (!inv) return { title: "Reto | Soy Reinaldo", robots: { index: false } };
  const title = `⚔️ ${inv.retador} te reta${inv.jornada ? ` en la jornada ${inv.jornada}` : ""}`;
  return { title: `${title} | Soy Reinaldo`, description: "Pronostica y gana quien más puntos saque.", robots: { index: false }, openGraph: { title } };
}

/**
 * Reto por enlace (17-oct, pedido del dueño): "Te reto en la jornada 10".
 * Sin sesión, lleva a crear la cuenta y vuelve aquí; con sesión, se acepta
 * de un toque (lq_aceptar_invitacion).
 */
export default async function RetoPage({ params, searchParams }: P) {
  const { usuario } = await params;
  const { liga } = await searchParams;
  const inv = await cargarInvitacion(decodeURIComponent(usuario), liga);
  if (!inv) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const vuelta = `/reto/${encodeURIComponent(usuario)}${liga ? `?liga=${encodeURIComponent(liga)}` : ""}`;

  return (
    <main className="page">
      <section className="section">
        <div className="wrap logro">
          <div className="panel logro__tarjeta">
            <Icono icono={Swords} tono="naranja" tam="lg" />
            <p className="mono logro__titulo">{inv.jornada ? `Duelo · jornada ${inv.jornada}` : "Duelo"}</p>
            <h1 className="logro__nombre">{inv.retador} te reta</h1>
            <p className="logro__detalle">
              <T>{`Gana quien más puntos saque en la jornada pronosticando los partidos. Liga: ${inv.liga}.`}</T>
            </p>
          </div>
          {!inv.jornada ? (
            <p className="logro__detalle">Ahora mismo no hay ninguna jornada por empezar. Vuelve más tarde.</p>
          ) : user?.id === inv.retadorId ? (
            <p className="logro__detalle">Este es tu enlace de reto: compártelo con tus amigos.</p>
          ) : user ? (
            <AceptarInvitacion ligaId={inv.ligaId} retadorId={inv.retadorId} jornada={inv.jornada} />
          ) : (
            <div className="logro__acciones">
              <Link href={`/signup?redirect=${encodeURIComponent(vuelta)}`} className="btn btn--accent">
                Crear cuenta y aceptar <span className="arr">→</span>
              </Link>
              <Link href={`/login?redirect=${encodeURIComponent(vuelta)}`} className="btn">
                Ya tengo cuenta
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
