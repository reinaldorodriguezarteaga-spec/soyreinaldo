import { headers } from "next/headers";

/**
 * True si la petición viene desde la app nativa (Capacitor añade
 * "SoyReinaldoApp" al User-Agent). Se usa para ocultar dentro de la app los
 * pagos (Stripe) y el login con Google, que provocan rechazo en App Store /
 * Play Store o no funcionan en el webview.
 */
export async function isAppRequest(): Promise<boolean> {
  const h = await headers();
  return (h.get("user-agent") ?? "").includes("SoyReinaldoApp");
}
