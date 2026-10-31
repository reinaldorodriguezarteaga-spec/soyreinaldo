"use client";
import Icono from "@/components/Icono";
import { Flame } from "lucide-react";

import Link from "next/link";
import { useEffect, useState } from "react";
import OfertaAvisos from "@/components/OfertaAvisos";
import { miRacha } from "@/app/juegos/acciones";
import { numeroDelDia } from "@/lib/juegos/diario";
import { rachaLocal } from "@/lib/juegos/racha";

/**
 * Racha en la portada de los juegos (23-oct, pedido del dueño): cuántos días
 * seguidos llevas y si hoy ya has jugado. Con sesión, la de la base de datos
 * y la oferta de avisos (el de la tarde, «no pierdas la racha», va por usuario).
 */
export default function RachaJuegos() {
  const [datos, setDatos] = useState<{ racha: number; hoy: boolean; sesion: boolean } | null>(null);

  useEffect(() => {
    const local = rachaLocal(numeroDelDia());
    miRacha()
      .then((r) =>
        setDatos(r ? { racha: Math.max(r.racha, r.hoy ? 1 : 0), hoy: r.hoy || local.hoy, sesion: true } : { ...local, sesion: false }),
      )
      .catch(() => setDatos({ ...local, sesion: false }));
  }, []);

  if (!datos) return null;
  const { racha, hoy, sesion } = datos;
  return (
    <div className="jg-racha">
      <p className="jg-racha__linea">
        {racha > 0 ? (
          <>
            <Icono icono={Flame} tono="naranja" tam="sm" />
            <b>{racha}</b> {racha === 1 ? "día" : "días"} de racha ·{" "}
            {hoy ? "hoy ya has jugado ✓" : <strong>hoy aún no has jugado: ¡que no se apague!</strong>}
          </>
        ) : (
          <>
            <Icono icono={Flame} tono="naranja" tam="sm" />
            Juega un reto del día cada día y empieza una racha.
          </>
        )}
      </p>
      {!sesion && racha > 0 && (
        <p className="jg-racha__nota">
          Tu racha vive solo en este navegador. <Link href="/login?redirect=/juegos">Entra</Link> para guardarla y salir en el ranking.
        </p>
      )}
      {sesion && <OfertaAvisos clave="juegos-racha" texto="¿Te avisamos por la tarde si vas a perder la racha?" />}
    </div>
  );
}
