import "server-only";
import { isAppRequest } from "@/lib/is-app";
import { termino } from "@/lib/termino";

/** Para Server Components: `const t = await terminoServidor(); t("Juega la quiniela")`. */
export async function terminoServidor(): Promise<(texto: string) => string> {
  const enApp = await isAppRequest();
  return (texto: string) => termino(texto, enApp);
}
