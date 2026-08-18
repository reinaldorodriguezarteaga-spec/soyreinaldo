import { NextResponse } from "next/server";

/**
 * ads.txt — AdSense lo exige en la raíz del dominio para verificar que el
 * inventario de anuncios se vende de forma autorizada. Generado desde
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID en vez de un archivo estático para que
 * nunca quede desincronizado si cambia el Publisher ID.
 */
export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) {
    return new NextResponse("", { status: 404 });
  }
  // AdSense da el id como "ca-pub-XXXX"; ads.txt quiere solo "pub-XXXX".
  const pubId = clientId.replace(/^ca-/, "");
  const body = `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
