import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Guardia anti-SSRF: el extractor de imágenes descarga URLs arbitrarias que
// escribe el admin, pero nunca debe poder alcanzar IPs internas (metadata de
// la nube, localhost, red privada). Solo corre en Node (usa dns), no en Edge.

const cacheHosts = new Map<string, boolean>();
const CACHE_MAX = 500;

function ipEsPrivada(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6: loopback, link-local, ULA y mapeos de IPv4.
    const low = ip.toLowerCase();
    if (low === "::1" || low === "::") return true;
    if (low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd"))
      return true;
    const v4 = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return v4 ? ipEsPrivada(v4[1]) : false;
  }
  const partes = ip.split(".").map(Number);
  if (partes.length !== 4 || partes.some((n) => Number.isNaN(n))) return true;
  const [a, b] = partes;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local (metadata cloud)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast y reservadas
  );
}

/**
 * Valida que una URL sea http(s) y apunte a una IP pública.
 * Devuelve la URL parseada o lanza con un mensaje presentable.
 */
export async function validarUrlPublica(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("URL no válida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Solo se admiten URLs http(s)");
  }
  const host = url.hostname;
  if (isIP(host)) {
    if (ipEsPrivada(host)) throw new Error("IP privada bloqueada");
    return url;
  }
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Host interno bloqueado");
  }
  const cacheado = cacheHosts.get(host);
  if (cacheado === true) return url;
  if (cacheado === false) throw new Error("El host resuelve a una IP privada");
  let privada = false;
  try {
    const res = await lookup(host, { all: true });
    privada = res.some((r) => ipEsPrivada(r.address));
  } catch {
    throw new Error(`No se pudo resolver el host ${host}`);
  }
  if (cacheHosts.size >= CACHE_MAX) cacheHosts.clear();
  cacheHosts.set(host, !privada);
  if (privada) throw new Error("El host resuelve a una IP privada");
  return url;
}
