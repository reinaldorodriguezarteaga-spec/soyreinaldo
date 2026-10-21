/**
 * Guardar en la galería desde la web cuando corre dentro de la app (1.1 en
 * adelante, plugin @capacitor-community/media). En el WebView de la app no
 * hay descargas ni hoja de compartir con archivos, así que «Crear foto» y
 * compañía no hacían nada (21-oct, pedido del dueño).
 *
 * Sin el plugin (navegador normal o la app 1.0) `guardarEnGaleria` devuelve
 * false y cada botón sigue con su camino de siempre.
 */

type Album = { identifier: string; name: string };
type PluginMedia = {
  savePhoto(o: { path: string; albumIdentifier?: string; fileName?: string }): Promise<unknown>;
  saveVideo(o: { path: string; albumIdentifier?: string; fileName?: string }): Promise<unknown>;
  getAlbums(): Promise<{ albums: Album[] }>;
  createAlbum(o: { name: string }): Promise<void>;
};
type CapacitorGlobal = {
  isPluginAvailable?: (nombre: string) => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, unknown>;
};

const ALBUM = "Soy Reinaldo";

function capacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null;
}

function plugin(): PluginMedia | null {
  const cap = capacitor();
  if (!cap?.isPluginAvailable?.("Media")) return null;
  return (cap.Plugins?.Media as PluginMedia | undefined) ?? null;
}

export const puedeGuardarEnGaleria = () => plugin() != null;

/** En Android el plugin exige álbum: el de la app, creado la primera vez.
 * En iOS sin álbum: así solo pide permiso para AÑADIR fotos. */
async function albumAndroid(m: PluginMedia): Promise<string | undefined> {
  if (capacitor()?.getPlatform?.() !== "android") return undefined;
  const buscar = async () => (await m.getAlbums()).albums.find((a) => a.name === ALBUM)?.identifier;
  const ya = await buscar();
  if (ya) return ya;
  await m.createAlbum({ name: ALBUM });
  return buscar();
}

const aDataUrl = (blob: Blob) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => mal(r.error);
    r.readAsDataURL(blob);
  });

/** Guarda la imagen (o el vídeo) en la galería. true si se guardó. */
export async function guardarEnGaleria(blob: Blob, nombre: string): Promise<boolean> {
  const m = plugin();
  if (!m) return false;
  try {
    const opciones = {
      path: await aDataUrl(blob),
      albumIdentifier: await albumAndroid(m),
      fileName: nombre.replace(/\.[a-z0-9]+$/i, ""),
    };
    await (blob.type.startsWith("video/") ? m.saveVideo(opciones) : m.savePhoto(opciones));
    return true;
  } catch {
    return false;
  }
}
