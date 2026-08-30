/**
 * Detección de plataforma para las piezas de "instalar como app": el banner
 * de instalación y `GoalAlerts` (avisos de gol). Compartido para no tener
 * dos definiciones de "es iOS" que un día se separen.
 *
 * `esIOS`/`esAndroid` piden el user-agent explícito en vez de leer
 * `navigator` ellas mismas: así siguen siendo funciones puras, testeables
 * sin DOM, y quien las llama (siempre un Client Component, dentro de un
 * efecto) decide de dónde sale el string.
 */

export function esIOS(ua: string): boolean {
  return /iphone|ipad|ipod/i.test(ua);
}

export function esAndroid(ua: string): boolean {
  return /android/i.test(ua);
}

export function esMovil(ua: string): boolean {
  return esIOS(ua) || esAndroid(ua);
}

/** ¿La web ya corre como app instalada (standalone)? Depende de `window`,
 * así que solo tiene sentido llamarla en el cliente. */
export function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS usa esta propiedad, fuera del estándar.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Cuánto se espera antes de volver a ofrecer el banner tras cerrarlo. */
export const REOFRECER_INSTALACION_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Pura y testeable: ¿toca volver a mostrar el banner de instalación?
 * `dismissedAt` es el timestamp (ms) guardado al cerrarlo, o `null` si
 * nunca se cerró.
 */
export function debeReofrecerInstalacion(
  dismissedAt: number | null,
  now: number,
): boolean {
  if (dismissedAt == null) return true;
  return now - dismissedAt > REOFRECER_INSTALACION_MS;
}
