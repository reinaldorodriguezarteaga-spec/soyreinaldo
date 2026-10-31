import type { LucideIcon } from "lucide-react";

/**
 * Icono de Lucide en una ficha de color (31-oct, pedido del dueño: fuera
 * emojis). El tono tiñe el icono y, más suave, el fondo de la ficha.
 *
 * Para un icono suelto dentro de un texto o un botón no hace falta esto:
 * `<Trophy className="ico-txt" aria-hidden />` (mide 1em y hereda el color).
 */
export type Tono = "azul" | "naranja" | "verde" | "rojo" | "oro" | "morado" | "neutro";

export default function Icono({
  icono: I,
  tono = "azul",
  tam = "md",
  className,
}: {
  icono: LucideIcon;
  tono?: Tono;
  tam?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={`ico ico--${tono} ico--${tam}${className ? ` ${className}` : ""}`} aria-hidden>
      <I strokeWidth={2.2} />
    </span>
  );
}
