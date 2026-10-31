import { Vote } from "lucide-react";
import Icono from "@/components/Icono";
import { asegurarMvp, cargarEncuestas, type Opcion } from "@/lib/encuestas";
import EncuestaCard from "@/components/EncuestaCard";
import EncuestaNueva from "@/components/EncuestaNueva";

/**
 * Encuestas de la ficha (17-oct, pedido del dueño). Al terminar el partido
 * crea sola la de "¿Quién fue el mejor?" con los 5 mejor valorados; el admin
 * puede lanzar más en directo.
 */
export default async function MatchEncuestas({
  fixtureId,
  candidatosMvp,
}: {
  fixtureId: number;
  /** Solo si el partido ha terminado y hay notas. */
  candidatosMvp: Opcion[] | null;
}) {
  if (candidatosMvp) await asegurarMvp(fixtureId, candidatosMvp).catch(() => {});
  const { encuestas, conSesion, esAdmin } = await cargarEncuestas(fixtureId);
  if (encuestas.length === 0 && !esAdmin) return null;
  return (
    <div style={{ marginTop: 28 }}>
      <div className="shead">
        <h2><Icono icono={Vote} tono="azul" tam="sm" /> Opina</h2>
        <span className="sh-note">la comunidad vota</span>
      </div>
      <div className="encuestas">
        {encuestas.map((e) => (
          <EncuestaCard key={e.id} {...e} conSesion={conSesion} esAdmin={esAdmin} />
        ))}
      </div>
      {esAdmin && <EncuestaNueva fixtureId={fixtureId} />}
    </div>
  );
}
