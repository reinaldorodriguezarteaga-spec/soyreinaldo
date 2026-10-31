import { Newspaper } from "lucide-react";
import Icono from "@/components/Icono";
import { textoCronica, type DatosCronica } from "@/lib/partido/cronica";

/**
 * Crónica automática del partido terminado (ver lib/partido/cronica.ts).
 * Texto en el HTML del servidor: es lo que lee Google.
 */
export default function MatchCronica({ datos }: { datos: DatosCronica }) {
  const frases = textoCronica(datos);
  if (frases.length < 2) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2><Icono icono={Newspaper} tono="azul" tam="sm" /> La crónica</h2>
        <span className="sh-note">en datos</span>
      </div>
      <div className="panel" style={{ padding: 20 }}>
        {frases.map((f, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "12px 0 0", lineHeight: 1.6, fontWeight: i === 0 ? 600 : 400 }}>
            {f}
          </p>
        ))}
      </div>
    </div>
  );
}
