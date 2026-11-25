/**
 * Anuncios de AdMob dentro de la app (25-nov-2026). Igual que los avisos
 * (`lib/push/app-nativa.ts`): Capacitor inyecta `window.Capacitor` con los
 * plugins de la app que muestra la web, y aquí se usa el de AdMob sin añadir
 * dependencias. En el navegador, o en una app sin el plugin (1.2 y
 * anteriores), `admobNativo()` devuelve null y no pasa nada.
 *
 * Los IDs son de la cuenta de AdMob del dueño (pub-9017229444251239). En
 * AdMob están bloqueadas las apuestas, los casinos sociales, el alcohol y los
 * temas de adultos, y la calificación máxima es «PG»: la app es 4+ y Apple ya
 * la rechazó por la norma 2.3.6 (apuestas). No quitar esos bloqueos.
 */

type Escucha = { remove: () => Promise<void> };

type ConsentInfo = {
  status: "NOT_REQUIRED" | "OBTAINED" | "REQUIRED" | "UNKNOWN";
  isConsentFormAvailable?: boolean;
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: "NOT_REQUIRED" | "REQUIRED" | "UNKNOWN";
};

export type PluginAdMob = {
  initialize(o?: Record<string, unknown>): Promise<void>;
  requestConsentInfo(o?: Record<string, unknown>): Promise<ConsentInfo>;
  showConsentForm(): Promise<ConsentInfo>;
  showPrivacyOptionsForm(): Promise<void>;
  trackingAuthorizationStatus(): Promise<{ status: "authorized" | "denied" | "notDetermined" | "restricted" }>;
  requestTrackingAuthorization(): Promise<void>;
  showBanner(o: Record<string, unknown>): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  prepareInterstitial(o: Record<string, unknown>): Promise<unknown>;
  showInterstitial(): Promise<void>;
  addListener(evento: string, cb: (info: { width?: number; height?: number }) => void): Promise<Escucha>;
};

type CapacitorGlobal = {
  isPluginAvailable?: (nombre: string) => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

function capacitor(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function admobNativo(): PluginAdMob | null {
  const cap = capacitor();
  if (!cap?.isPluginAvailable?.("AdMob")) return null;
  return (cap.Plugins?.AdMob as PluginAdMob | undefined) ?? null;
}

export function plataformaAnuncios(): "android" | "ios" {
  return capacitor()?.getPlatform?.() === "android" ? "android" : "ios";
}

/** Bloques de anuncios creados en AdMob el 25-nov-2026. */
export const BLOQUES = {
  ios: {
    banner: "ca-app-pub-9017229444251239/3659780966",
    pantallaCompleta: "ca-app-pub-9017229444251239/3316486837",
  },
  android: {
    banner: "ca-app-pub-9017229444251239/9228249523",
    pantallaCompleta: "ca-app-pub-9017229444251239/1401730391",
  },
} as const;

/** Anuncios de prueba de Google (para probar sin tocar los reales):
 * NEXT_PUBLIC_ADMOB_PRUEBA=1. */
export const EN_PRUEBAS = process.env.NEXT_PUBLIC_ADMOB_PRUEBA === "1";

/** Rutas donde no sale el anuncio a pantalla completa: mientras se juega o
 * se entra, no se interrumpe. */
const SIN_PANTALLA_COMPLETA = [
  "/adivina",
  "/adivina-champions",
  "/juegos/",
  "/login",
  "/signup",
  "/pizarra",
];

export function admitePantallaCompleta(ruta: string): boolean {
  return !SIN_PANTALLA_COMPLETA.some((p) => ruta.startsWith(p));
}
