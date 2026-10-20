import { ImageResponse } from "next/og";
import { decodificar } from "@/lib/pizarra/estado";
import { equiposVistaPrevia } from "@/lib/pizarra/equipos-vista-previa";
import { fichasVistaPrevia } from "@/lib/pizarra/vista-previa";
import { getTeamSquad } from "@/lib/sports/api-football";

export const dynamic = "force-dynamic";

const ANCHO = 1080;
const ALTO = 410;
const MARGEN = 26;
const largo = ANCHO - 2 * MARGEN;
const ancho = ALTO - 2 * MARGEN;
const x = (v: number) => MARGEN + v * largo;
const y = (v: number) => MARGEN + v * ancho;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const p = params.get("p");
  const estado = p && p.length <= 12000 ? decodificar(p, null) : null;
  const equipos = estado ? await equiposVistaPrevia(
    params.get("local") ?? undefined,
    params.get("visitante") ?? undefined,
    params.get("partido") ?? undefined,
  ) : null;
  const valido = equipos && estado;
  const plantillas = equipos ? await Promise.all([
    getTeamSquad(equipos.local.id).catch(() => []),
    getTeamSquad(equipos.visitante.id).catch(() => []),
  ]) : [[], []];
  const fichas = valido ? fichasVistaPrevia(estado, { local: plantillas[0], visitante: plantillas[1] }) : [];

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "24px 60px", background: "linear-gradient(160deg, #0a1030 0%, #1b2a6b 100%)", color: "#e8ecff", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 800, maxWidth: ANCHO, textAlign: "center" }}>
          {valido ? `${equipos.local.name} vs ${equipos.visitante.name}` : "Pizarra táctica"}
        </div>
        {valido && <div style={{ display: "flex", fontSize: 23, color: "#f5c542", marginTop: 6 }}>{`${estado.formacion.local} · ${estado.formacion.visitante}`}</div>}
      </div>
      <div style={{ display: "flex", position: "relative", width: ANCHO, height: ALTO, background: "#10271c", borderRadius: 12 }}>
        <svg width={ANCHO} height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} style={{ position: "absolute", left: 0, top: 0 }}>
          {valido && estado.zonas.map((z, i) => <rect key={`zona-${i}`} x={x(Math.min(z.a.x, z.b.x))} y={y(Math.min(z.a.y, z.b.y))} width={Math.abs(z.b.x - z.a.x) * largo} height={Math.abs(z.b.y - z.a.y) * ancho} fill={z.color} opacity="0.28" />)}
          <rect x={MARGEN} y={MARGEN} width={largo} height={ancho} fill="none" stroke="#8da99a" strokeWidth="2" />
          <line x1={ANCHO / 2} y1={MARGEN} x2={ANCHO / 2} y2={ALTO - MARGEN} stroke="#8da99a" strokeWidth="2" />
          <circle cx={ANCHO / 2} cy={ALTO / 2} r="49" fill="none" stroke="#8da99a" strokeWidth="2" />
          <circle cx={ANCHO / 2} cy={ALTO / 2} r="3" fill="#8da99a" />
          {[false, true].map((derecha) => <rect key={String(derecha)} x={derecha ? ANCHO - MARGEN - 130 : MARGEN} y={ALTO / 2 - 106} width="130" height="212" fill="none" stroke="#8da99a" strokeWidth="2" />)}
          {[false, true].map((derecha) => <rect key={`area-${derecha}`} x={derecha ? ANCHO - MARGEN - 45 : MARGEN} y={ALTO / 2 - 53} width="45" height="106" fill="none" stroke="#8da99a" strokeWidth="2" />)}
          {valido && estado.flechas.map((f, i) => <line key={`flecha-${i}`} x1={x(f.a.x)} y1={y(f.a.y)} x2={x(f.b.x)} y2={y(f.b.y)} stroke={f.tipo === "pase" ? "#ffffff" : "#f5c542"} strokeWidth="4" strokeLinecap="round" />)}
        </svg>
        {fichas.map((f) => <div key={`${f.lado}:${f.indice}`} style={{ display: "flex", position: "absolute", left: x(f.x) - 48, top: y(f.y) - 18, width: 96, flexDirection: "column", alignItems: "center" }}>
          <div style={{ display: "flex", width: 36, height: 36, borderRadius: 36, background: f.color, border: "2px solid #e8ecff", color: f.color === "#111827" || f.color === "#a50044" || f.color === "#8b5cf6" ? "#ffffff" : "#0a1030", alignItems: "center", justifyContent: "center", fontSize: 21, fontWeight: 800 }}>{f.dorsal ?? ""}</div>
          {f.apellido && f.apellido.length <= 14 && <div style={{ display: "flex", fontSize: 14, marginTop: 2, padding: "1px 4px", borderRadius: 3, background: "#10271c", color: "#ffffff" }}>{f.apellido}</div>}
        </div>)}
        {valido && estado.balon && <div style={{ display: "flex", position: "absolute", left: x(estado.balon.x) - 9, top: y(estado.balon.y) - 9, width: 18, height: 18, borderRadius: 18, background: "#ffffff", border: "5px solid #111827" }} />}
      </div>
      <div style={{ display: "flex", fontSize: 23, color: "#f5c542" }}>soyreinaldo.com/pizarra</div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}
