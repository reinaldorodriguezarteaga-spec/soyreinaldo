import { redirect } from "next/navigation";

/** El hub de la quiniela abre en Pronósticos (la barra de pestañas del layout
 * da acceso a Clasificación y Especiales). */
export default function QuinielaLigaIndex() {
  redirect("/quiniela-liga/partidos");
}
