/**
 * API-Football escribe los nombres sin tildes ("Malaga", "Atletico Madrid").
 * En los textos redactados (la previa) y en nuestra tabla `lq_teams` los
 * queremos bien escritos. Solo los que hacen falta; el resto pasa igual.
 * La misma lista está en scripts/seed-liga-quiniela.mjs (si se añade uno,
 * añadirlo allí también).
 */
const CON_TILDES: Record<string, string> = {
  Alaves: "Alavés",
  "Atletico Madrid": "Atlético Madrid",
  "Deportivo La Coruna": "Deportivo La Coruña",
  Malaga: "Málaga",
  Cadiz: "Cádiz",
  Leganes: "Leganés",
  Almeria: "Almería",
};

export function conTildes(nombre: string): string {
  return CON_TILDES[nombre] ?? nombre;
}
