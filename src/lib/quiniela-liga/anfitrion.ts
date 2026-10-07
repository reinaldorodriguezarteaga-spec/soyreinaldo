/**
 * El anfitrión de la quiniela: Reinaldo. "¿Le ganas a Reinaldo?" es el gancho
 * propio de esta quiniela frente a cualquier otra. Mismo id que la función
 * SQL `lq_anfitrion_id()` (migración 057).
 */
export const ANFITRION_ID = "399661dd-1b61-406b-a6ec-2e15e147a1dc";
export const ANFITRION_NOMBRE = "Reinaldo";

/** Pronóstico del anfitrión en un partido (función `lq_pronosticos_anfitrion`):
 * el marcador solo aparece desde el pitido inicial, como el de cualquiera. */
export type PronosticoAnfitrion = {
  hecho: boolean;
  home: number | null;
  away: number | null;
};
