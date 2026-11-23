import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Probabilidades 1X2 del proveedor para las tarjetas de "Próximos".
 *
 * APAGADO en web y app desde el 23-nov-2026: Apple las cuenta como
 * información de apuestas (rechazo de la 1.1, norma 2.3.6) y el dueño no
 * quiere nada de apuestas en ningún lado. Se deja la ruta respondiendo vacío
 * para que los clientes ya cargados no fallen.
 */
export async function GET() {
  return NextResponse.json({});
}
