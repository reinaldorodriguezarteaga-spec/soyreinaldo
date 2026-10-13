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
        <h2>📰 La crónica</h2>
        <span className="sh-note">en datos</span>
      </div>
      <div className="panel" style={{ padding: 20 }}>
        <p style={{ margin: 0, lineHeight: 1.6 }}>{frases.join(" ")}</p>
      </div>
    </div>
  );
}
