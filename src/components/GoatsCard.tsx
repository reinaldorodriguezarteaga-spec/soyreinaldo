import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * Messi vs Ronaldo en la portada (13-oct-2026, pedido del dueño): carrera en
 * partidos oficiales (club y selección). Base de una fuente con el mismo
 * criterio para los dos (`goat_base`) + cada partido que juegan desde
 * entonces (`goat_partidos`, lo apunta el cron `goats`). Sin llamadas al API.
 */
type Base = { jugador: string; api_id: number; partidos: number; goles: number; asistencias: number; fuente: string };
type Partido = { jugador: string; minutos: number; goles: number; asistencias: number };

const FILAS = [
  { clave: "partidos", label: "Partidos jugados" },
  { clave: "goles", label: "Goles" },
  { clave: "asistencias", label: "Asistencias" },
  { clave: "ga", label: "G/A", nota: "goles + asistencias" },
] as const;

export default async function GoatsCard({ enlace = false }: { enlace?: boolean } = {}) {
  const supabase = await createClient();
  const [{ data: bases }, { data: partidos }] = await Promise.all([
    supabase.from("goat_base").select("jugador, api_id, partidos, goles, asistencias, fuente").returns<Base[]>(),
    supabase.from("goat_partidos").select("jugador, minutos, goles, asistencias").returns<Partido[]>(),
  ]);
  const total = (jugador: string) => {
    const b = (bases ?? []).find((x) => x.jugador === jugador);
    if (!b) return null;
    const suyos = (partidos ?? []).filter((p) => p.jugador === jugador);
    const jugados = suyos.filter((p) => p.minutos > 0);
    const partidosT = b.partidos + jugados.length;
    const goles = b.goles + jugados.reduce((n, p) => n + p.goles, 0);
    const asistencias = b.asistencias + jugados.reduce((n, p) => n + p.asistencias, 0);
    return { apiId: b.api_id, fuente: b.fuente, partidos: partidosT, goles, asistencias, ga: goles + asistencias };
  };
  const messi = total("messi");
  const ronaldo = total("ronaldo");
  if (!messi || !ronaldo) return null;

  const fmt = (n: number) => n.toLocaleString("es-ES");
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
          const m = messi[f.clave];
          const r = ronaldo[f.clave];
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
            <span key={`${f.clave}-m`} style={estilo(m > r, "left")}>{fmt(m)}</span>,
            <span key={`${f.clave}-l`} style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "0.82rem", lineHeight: 1.2 }}>
              {f.label}
              {"nota" in f && <><br /><small style={{ fontSize: "0.68rem" }}>{f.nota}</small></>}
            </span>,
            <span key={`${f.clave}-r`} style={estilo(r > m, "right")}>{fmt(r)}</span>,
          ];
        })}
      </div>
      <p style={{ margin: "18px 0 0", color: "var(--text-dim)", fontSize: "0.74rem" }}>
        Carrera en partidos oficiales, con club y selección. Se actualiza tras cada partido que juegan. Base: {messi.fuente}.
      </p>
      {enlace && (
        <Link href="/messi-vs-ronaldo" className="btn btn--accent" style={{ marginTop: 16 }}>
          Ver la comparativa completa <span className="arr">→</span>
        </Link>
      )}
    </div>
  );
}
