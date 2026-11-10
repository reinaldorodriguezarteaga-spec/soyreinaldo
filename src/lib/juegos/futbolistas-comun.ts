/**
 * Un futbolista de hoy tal como lo ven los juegos (servidor y navegador).
 * Los datos salen de `futbolistas.ts` (solo servidor).
 */
export type Futbolista = {
  id: number;
  /** Nombre completo, el que se enseña («Lamine Yamal»). */
  nombre: string;
  /** Apellido por el que se le conoce («Yamal», «van Dijk», «Pedri»). */
  apellido: string;
  liga: { id: number; nombre: string };
  equipo: { id: number; nombre: string };
  posicion: string | null;
  edad: number | null;
  dorsal: number | null;
  /** Código de bandera en media.api-sports.io/flags. */
  bandera: string | null;
  pais: string | null;
  /** Tiene foto de verdad (no la silueta genérica). */
  foto: boolean;
};

export const fotoDe = (id: number) => `https://media.api-sports.io/football/players/${id}.png`;
export const escudoDe = (id: number) => `https://media.api-sports.io/football/teams/${id}.png`;
export const banderaDe = (codigo: string) => `https://media.api-sports.io/flags/${codigo}.svg`;
