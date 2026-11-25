import { delDia } from "@/lib/juegos/diario";
import type { JuegoRanking } from "@/lib/juegos/niveles";

/**
 * El juego destacado como «Reto del día» (25-nov-2026, pedido del dueño):
 * antes era siempre Adivina el equipo; ahora rota entre los 12 juegos con
 * reto diario, el mismo para todos y sin repetir hasta que salen todos.
 */
export type JuegoDiario = {
  juego: JuegoRanking;
  href: string;
  /** Clave de su guardado en el navegador (ver `racha.ts`). */
  clave: string;
  titulo: string;
  corto: string;
};

export const JUEGOS_DIARIOS: readonly JuegoDiario[] = [
  { juego: "equipo", href: "/juegos/adivina-el-equipo", clave: "jg-equipo-v1", titulo: "Adivina el equipo", corto: "Un once histórico con banderas" },
  { juego: "top10", href: "/juegos/top-10", clave: "jg-top10-v1", titulo: "Top 10", corto: "Los 10 que más jugaron o marcaron" },
  { juego: "misterioso", href: "/juegos/futbolista-misterioso", clave: "jg-misterioso-v1", titulo: "Futbolista misterioso", corto: "Pistas al comparar con otros jugadores" },
  { juego: "escudo", href: "/juegos/escudo-borroso", clave: "jg-escudo-v1", titulo: "Escudo borroso", corto: "Se aclara con cada fallo" },
  { juego: "foto", href: "/juegos/foto-oculta", clave: "jg-foto-v1", titulo: "Foto oculta", corto: "Se destapa por trozos" },
  { juego: "agrupa", href: "/juegos/agrupa-los-cuatro", clave: "jg-agrupa-v1", titulo: "Agrupa los cuatro", corto: "16 nombres, 4 grupos" },
  { juego: "cronologia", href: "/juegos/cronologia", clave: "jg-cronologia-v1", titulo: "Cronología", corto: "Ordena los momentos por fecha" },
  { juego: "ahorcado", href: "/juegos/ahorcado", clave: "jg-ahorcado-v1", titulo: "Ahorcado", corto: "Letra a letra, antes de cinco fallos" },
  { juego: "jugador", href: "/juegos/adivina-el-jugador", clave: "jg-jugador-v1", titulo: "Adivina el jugador", corto: "Sus clubes, en orden" },
  { juego: "tikitaka", href: "/juegos/tiki-taka-toe", clave: "jg-tikitaka-v1", titulo: "Tiki-taka-toe", corto: "El tres en raya del fútbol" },
  { juego: "leyenda", href: "/juegos/once-de-leyenda", clave: "jg-leyendas-v1", titulo: "Once de leyenda", corto: "Elige tu once histórico" },
  { juego: "masomenos", href: "/juegos/mas-o-menos", clave: "jg-masomenos-v1", titulo: "¿Más o menos?", corto: "Racha hasta que falles" },
];

export const retoDelDia = (numero: number): JuegoDiario => delDia(JUEGOS_DIARIOS, numero);

export const rutaDelJuego = (juego: JuegoRanking): string =>
  JUEGOS_DIARIOS.find((j) => j.juego === juego)?.href ?? "/juegos";
