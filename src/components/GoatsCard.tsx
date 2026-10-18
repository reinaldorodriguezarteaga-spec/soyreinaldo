import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FILAS_GOATS as FILAS, totalesGoats } from "@/lib/goats";

/**
 * Messi vs Ronaldo en la portada (13-oct-2026, pedido del dueño): carrera en
 * partidos oficiales (club y selección). Los totales salen de
 * `lib/goats.ts`. Sin llamadas al API.
 */
export default async function GoatsCard({ enlace = false }: { enlace?: boolean } = {}) {
  const totales = await totalesGoats(await createClient());
  if (!totales) return null;
  const { messi, ronaldo } = totales;

  const lado = (nombre: string, apiId: number, alinear: "left" | "right") => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: alinear === "left" ? "flex-start" : "flex-end", gap: 8 }}>
      <Image
        src={`https://media.api-sports.io/football/players/${apiId}.png`}
        alt={nombre}
        width={96}
        height={96}
        unoptimized
        style={{ width: "clamp(64px, 12vw, 96px)", height: "auto", borderRadius: "50%", border: "3px solid var(--accent)", background: "#e2e8f0" }}
      />
      <b className="feat__title" style={{ fontSize: "clamp(1.1rem, 2.6vw, 1.6rem)" }}>{nombre}</b>
    </div>
  );

  return (
    <div className="panel promopanel" style={{ cursor: "default" }}>
      <p className="eyebrow">🐐 El debate eterno</p>
      <h2 className="feat__title" style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.6rem)", marginTop: 4 }}>
        Messi vs Ronaldo.
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: "12px 16px",
          marginTop: 22,
        }}
      >
        {lado("Messi", messi.apiId, "left")}
        <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>VS</span>
        {lado("Cristiano", ronaldo.apiId, "right")}
        {FILAS.map((f) => {
          const m = f.peso(messi);
          const r = f.peso(ronaldo);
          const estilo = (gana: boolean, alinear: "left" | "right") =>
            ({
              textAlign: alinear,
              fontFamily: "var(--font-display-stack)",
              fontSize: "clamp(1.5rem, 4vw, 2.4rem)",
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: gana ? "var(--accent-2)" : "var(--text)",
            }) as const;
          return [
            <span key={`${f.clave}-m`} style={estilo(m > r, "left")}>{f.valor(messi)}</span>,
            <span key={`${f.clave}-l`} style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", lineHeight: 1.2 }}>
              {f.label}
              {f.nota && <><br /><small style={{ fontSize: "0.68rem" }}>{f.nota}</small></>}
            </span>,
            <span key={`${f.clave}-r`} style={estilo(r > m, "right")}>{f.valor(ronaldo)}</span>,
          ];
        })}
      </div>
      {enlace && (
        <Link href="/messi-vs-ronaldo" className="btn btn--accent" style={{ marginTop: 16 }}>
          Ver la comparativa completa <span className="arr">→</span>
        </Link>
      )}
    </div>
  );
}
