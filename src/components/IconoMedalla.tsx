import { Flame, ListChecks, Medal, Mic, Target } from "lucide-react";
import type { Medalla } from "@/lib/quiniela-liga/medallas";
import Icono from "@/components/Icono";

const ICONOS = { mejor: Medal, francotirador: Target, pleno: ListChecks, constancia: Flame, reinaldo: Mic };

export default function IconoMedalla({ clave, ficha = false }: { clave: Medalla["clave"]; ficha?: boolean }) {
  const I = ICONOS[clave];
  return ficha ? <Icono icono={I} tono="oro" tam="lg" /> : <I className="ico-txt" aria-hidden />;
}
