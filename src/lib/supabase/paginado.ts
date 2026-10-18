/**
 * Todas las filas de una consulta, de 1.000 en 1.000 (18-oct): la API de
 * Supabase corta cada respuesta en 1.000 filas sin avisar, y la racha del
 * dueño salía 0 porque sus últimas jornadas quedaban fuera. La consulta
 * debe venir con un orden estable (`.order(...)`) para que las páginas no
 * se solapen.
 */
const PAGINA = 1000;

export async function todasLasFilas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await pagina(desde, desde + PAGINA - 1);
    if (error || !data) break;
    out.push(...data);
    if (data.length < PAGINA) break;
  }
  return out;
}
