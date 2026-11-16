import Link from "next/link";

/** Botón del final de partida para volver a la lista de juegos sin buscar
 * la flecha de atrás arriba (pedido del dueño, 16-nov-2026). */
export default function VolverJuegos() {
  return (
    <Link href="/juegos" className="btn btn--ghost">
      ← Todos los juegos
    </Link>
  );
}
