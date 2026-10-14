import { headers } from "next/headers";

/**
 * True si la petición viene desde la app nativa (Capacitor añade
 * "SoyReinaldoApp" al User-Agent). Se usa para ocultar dentro de la app lo
 * que provoca rechazo en App Store / Play Store o no funciona en el webview:
 * pagos (Stripe), login con Google, cuotas, anuncios y banner de cookies,
 * franja de instalar, avisos de gol (Web Push) y comentarios.
 *
 * ⚠️ Lo que se oculta aquí tiene que SEGUIR oculto después de aprobada la
 * app: enseñar al revisor una cosa y activar otra después va contra las
 * normas de Apple (2.3.1) y es motivo para retirarla.
 */
export async function isAppRequest(): Promise<boolean> {
  const h = await headers();
  return (h.get("user-agent") ?? "").includes("SoyReinaldoApp");
}
