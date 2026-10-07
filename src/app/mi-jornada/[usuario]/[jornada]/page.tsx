import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tarjetaJornada } from "@/lib/quiniela-liga/jornada-datos";
import Compartir from "./compartir";

const SITE = "https://www.soyreinaldo.com";

type Props = { params: Promise<{ usuario: string; jornada: string }> };

/**
 * Tarjeta "mi jornada" para compartir: la enlaza el resumen de jornada. Es
 * pública (para que se vea al abrirla desde WhatsApp sin cuenta) y fuera de
 * /quiniela* (ese prefijo exige sesión). noindex: es personal y no aporta a
 * Google; la imagen la genera opengraph-image.tsx.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { usuario, jornada } = await params;
  const t = await tarjetaJornada(decodeURIComponent(usuario), Number(jornada));
  const titulo = t
    ? `${t.nombre}: ${t.puntos} puntos en la jornada ${t.jornada}`
    : "Mi jornada en la quiniela";
  return {
    title: `${titulo} | Soy Reinaldo`,
    description: "Pronostica los partidos de LaLiga y compite en la quiniela de soyreinaldo.com.",
    robots: { index: false, follow: true },
    openGraph: { title: titulo, description: "¿Me ganas? Juega gratis en soyreinaldo.com" },
  };
}

export default async function MiJornada({ params }: Props) {
  const { usuario, jornada } = await params;
  const t = await tarjetaJornada(decodeURIComponent(usuario), Number(jornada));
  if (!t) notFound();

  const mov = t.puestoAhora != null && t.puestoAntes != null ? t.puestoAntes - t.puestoAhora : 0;
  const url = `${SITE}/mi-jornada/${encodeURIComponent(usuario)}/${t.jornada}`;
  const texto = `Hice ${t.puntos} puntos en la jornada ${t.jornada} de ${t.liga}${
    t.puestoAhora ? ` y voy ${t.puestoAhora}º` : ""
  }. ¿Me ganas?`;

  return (
    <main className="page">
      <section className="section">
        <div className="wrap" style={{ maxWidth: 560, textAlign: "center" }}>
          <p className="mono" style={{ color: "var(--text-dim)", letterSpacing: "0.12em", fontSize: "0.72rem" }}>
            {t.liga.toUpperCase()} · JORNADA {t.jornada}
          </p>
          <div className="panel" style={{ padding: "28px 24px", margin: "14px 0 22px" }}>
            <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{t.nombre}</h1>
            <p style={{ margin: "6px 0 0", fontSize: "4rem", fontWeight: 800, lineHeight: 1.1 }}>
              {t.puntos}
              <span style={{ fontSize: "1.2rem", fontWeight: 500, color: "var(--text-dim)" }}> puntos</span>
            </p>
            <p style={{ margin: "8px 0 0", color: "var(--text-dim)" }}>
              {t.exactos} exactos · {t.aciertos} aciertos · {t.jugados} pronósticos
            </p>
            {t.puestoAhora && (
              <p style={{ margin: "14px 0 0", fontSize: "1.1rem" }}>
                <strong>
                  {t.puestoAhora}º de {t.totalJugadores}
                </strong>
                {mov > 0 && <span style={{ color: "var(--accent)" }}> · sube {mov}</span>}
                {mov < 0 && <span style={{ color: "var(--text-dim)" }}> · baja {-mov}</span>}
              </p>
            )}
          </div>
          <Compartir url={url} texto={texto} />
          <p style={{ margin: "28px 0 0", color: "var(--text-dim)" }}>
            ¿Te animas? Pronostica los partidos de LaLiga y compite gratis.
          </p>
          <p style={{ margin: "10px 0 0" }}>
            <Link href="/quiniela-liga" className="btn btn--accent">
              Jugar a la quiniela <span className="arr">→</span>
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
