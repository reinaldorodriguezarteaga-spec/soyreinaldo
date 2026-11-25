"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CalendarRange,
  Check,
  ChevronRight,
  Flag,
  Flame,
  Grid3x3,
  HelpCircle,
  ImageOff,
  LayoutGrid,
  ListOrdered,
  Scale,
  Shield,
  Spline,
  Star,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import Icono, { type Tono } from "@/components/Icono";
import { miRacha } from "@/app/juegos/acciones";
import { numeroDelDia } from "@/lib/juegos/diario";
import { hechoElDia, rachaLocal } from "@/lib/juegos/racha";
import { JUEGOS_DIARIOS, retoDelDia } from "@/lib/juegos/reto-del-dia";
import type { JuegoRanking } from "@/lib/juegos/niveles";

const ICONOS: Record<JuegoRanking, [LucideIcon, Tono]> = {
  equipo: [Flag, "azul"],
  top10: [ListOrdered, "verde"],
  misterioso: [HelpCircle, "morado"],
  escudo: [Shield, "azul"],
  foto: [ImageOff, "naranja"],
  agrupa: [LayoutGrid, "verde"],
  cronologia: [CalendarRange, "oro"],
  ahorcado: [Spline, "rojo"],
  jugador: [UserSearch, "morado"],
  tikitaka: [Grid3x3, "verde"],
  leyenda: [Star, "oro"],
  masomenos: [Scale, "naranja"],
};

const sinSuscripcion = () => () => {};

/**
 * «Reto del día» (25-nov-2026, pedido del dueño): el juego que toca hoy (rota
 * cada día, ver `reto-del-dia.ts`), tu racha y cuántos retos llevas hoy. En
 * la portada es la razón para volver cada día; en /juegos, la tarjeta
 * destacada de arriba.
 *
 * El día se calcula en el navegador (medianoche de Madrid): en el servidor
 * la página se cachea y se quedaría con el juego de ayer.
 */
export default function RetoDelDia({ enPortada = false }: { enPortada?: boolean }) {
  const dia = useSyncExternalStore(sinSuscripcion, () => numeroDelDia(), () => null);
  const [estado, setEstado] = useState<{ racha: number; hechos: number; retoHecho: boolean } | null>(null);

  useEffect(() => {
    if (dia == null) return;
    const mirar = () => {
      const hechos = JUEGOS_DIARIOS.filter((j) => hechoElDia(j.clave, dia)).length;
      const retoHecho = hechoElDia(retoDelDia(dia).clave, dia);
      const local = rachaLocal(dia).racha;
      if (!enPortada) return setEstado({ racha: local, hechos, retoHecho });
      miRacha()
        .then((r) => setEstado({ racha: r ? Math.max(r.racha, local) : local, hechos, retoHecho }))
        .catch(() => setEstado({ racha: local, hechos, retoHecho }));
    };
    mirar();
    window.addEventListener("pageshow", mirar);
    return () => window.removeEventListener("pageshow", mirar);
  }, [dia, enPortada]);

  if (dia == null) return enPortada ? null : <div className="destacada destacada--cargando" aria-hidden />;
  const reto = retoDelDia(dia);
  const [icono, tono] = ICONOS[reto.juego];

  if (!enPortada) {
    return (
      <Link href={reto.href} className="destacada">
        <Icono icono={Flame} />
        <span className="destacada__txt">
          <small>Reto del día #{dia}</small>
          <b>{reto.titulo}</b>
          <span>{reto.corto}</span>
        </span>
        {estado?.retoHecho && (
          <span className="jg-hecho" role="img" aria-label="Hecho hoy">
            <Check aria-hidden />
          </span>
        )}
        <ChevronRight aria-hidden />
      </Link>
    );
  }

  const racha = estado?.racha ?? 0;
  const hechos = estado?.hechos ?? 0;
  return (
    <section className="panel retodia" aria-labelledby="retodia-titulo">
      <div className="retodia__cab">
        <p className="mono retodia__eyebrow">Reto del día #{dia}</p>
        {racha > 0 && (
          <p className="retodia__racha" title="Días seguidos con algún reto del día hecho">
            <Flame className="ico-txt" aria-hidden /> <b>{racha}</b> {racha === 1 ? "día" : "días"}
          </p>
        )}
      </div>
      <Link href={reto.href} className="retodia__juego">
        <Icono icono={icono} tono={tono} />
        <span className="retodia__txt">
          <b id="retodia-titulo">{reto.titulo}</b>
          <span>{reto.corto}</span>
        </span>
        <span className={`btn ${estado?.retoHecho ? "btn--ghost" : "btn--accent"} retodia__btn`}>
          {estado?.retoHecho ? "Hecho ✓" : "Jugar"}
        </span>
      </Link>
      <p className="retodia__pie">
        {racha > 0 && hechos === 0 ? (
          <strong>Hoy aún no has jugado: ¡que no se apague la racha!</strong>
        ) : hechos > 0 ? (
          <>
            Llevas <b>{hechos}</b> de {JUEGOS_DIARIOS.length} retos de hoy.
          </>
        ) : (
          <>Un reto distinto cada día. Juega todos los días y haz racha.</>
        )}{" "}
        <Link href="/juegos">Todos los juegos →</Link>
      </p>
    </section>
  );
}
