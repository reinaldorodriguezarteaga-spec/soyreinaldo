import { huecos, type Lado } from "@/lib/pizarra/formaciones";
import type { Estado } from "@/lib/pizarra/estado";

/** Miniatura de una pizarra para la galería: campo horizontal en SVG con
 * zonas, flechas y un punto por jugador (sin fotos: ligera y sin imágenes). */
const LADOS: Lado[] = ["local", "visitante"];
const W = 160;
const H = 100;

export default function MiniCampo({ estado }: { estado: Estado }) {
  const pos = (lado: Lado, i: number) => estado.movidos[`${lado}:${i}`] ?? huecos(estado.formacion[lado], lado)[i];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pzc-mini" role="img" aria-label="Vista previa de la pizarra">
      <rect x={0} y={0} width={W} height={H} rx={5} fill="#10271c" />
      <g stroke="rgba(255,255,255,0.22)" strokeWidth={0.6} fill="none">
        <line x1={W / 2} y1={0} x2={W / 2} y2={H} />
        <circle cx={W / 2} cy={H / 2} r={9} />
        <rect x={0} y={H * 0.22} width={W * 0.1} height={H * 0.56} />
        <rect x={W * 0.9} y={H * 0.22} width={W * 0.1} height={H * 0.56} />
      </g>
      {estado.zonas.map((z, k) => (
        <rect
          key={`z${k}`}
          x={Math.min(z.a.x, z.b.x) * W}
          y={Math.min(z.a.y, z.b.y) * H}
          width={Math.abs(z.b.x - z.a.x) * W}
          height={Math.abs(z.b.y - z.a.y) * H}
          fill={z.color}
          fillOpacity={0.22}
          stroke={z.color}
          strokeWidth={0.5}
          strokeDasharray="1.5 1"
        />
      ))}
      {estado.flechas.map((f, k) => (
        <line
          key={`f${k}`}
          x1={f.a.x * W}
          y1={f.a.y * H}
          x2={f.b.x * W}
          y2={f.b.y * H}
          stroke={f.tipo === "carrera" ? "#f5c542" : "#ffffff"}
          strokeWidth={0.8}
          strokeDasharray={f.tipo === "carrera" ? "2 1.4" : undefined}
          strokeLinecap="round"
        />
      ))}
      {LADOS.map((lado) =>
        estado.once[lado].map((id, i) => {
          if (id == null) return null;
          const p = pos(lado, i);
          const foco = estado.focos.includes(`${lado === "local" ? "l" : "v"}:${id}`);
          return (
            <circle
              key={`${lado}${i}`}
              cx={p.x * W}
              cy={p.y * H}
              r={2.6}
              fill={estado.colores[lado]}
              stroke={foco ? "#facc15" : "#ffffff"}
              strokeWidth={foco ? 1.2 : 0.6}
            />
          );
        }),
      )}
      {estado.balon && <circle cx={estado.balon.x * W} cy={estado.balon.y * H} r={1.6} fill="#fff" stroke="#000" strokeWidth={0.4} />}
    </svg>
  );
}
