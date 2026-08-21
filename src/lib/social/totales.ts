/**
 * Suma de seguidores.
 *
 * Las cifras de cada red se escriben a mano en el panel ("60K", "9,8K",
 * "+9.000") y el total TAMBIÉN se escribía a mano — con el resultado
 * previsible: el 20-ago el media kit anunciaba 169.100 cuando la suma real
 * eran 169.800. Ahora el total se calcula, y deja de poder descuadrarse.
 *
 * Acepta lo que se escribe de verdad: sufijos K y M, coma decimal española,
 * punto de millar y un "+" delante que solo significa "y pico".
 */

/** "9,8K" → 9800 · "+9.000" → 9000 · "1,2M" → 1200000. null si no hay número. */
export function aNumero(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const limpio = texto.trim().replace(/^\+/, "").replace(/\s/g, "");
  const m = limpio.match(/^([\d.,]+)\s*([KkMm])?$/);
  if (!m) return null;

  let cifra = m[1];
  const sufijo = m[2]?.toUpperCase();

  if (sufijo) {
    // Con sufijo, la coma es decimal ("9,8K") y el punto también ("9.8K").
    cifra = cifra.replace(",", ".");
    const n = Number.parseFloat(cifra);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * (sufijo === "M" ? 1_000_000 : 1_000));
  }

  // Sin sufijo, punto y coma son separadores de millar ("169.100").
  const n = Number.parseInt(cifra.replace(/[.,]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/** 169800 → "+169.800" (formato español). */
export function formatearTotal(n: number): string {
  return `+${n.toLocaleString("es-ES")}`;
}

/**
 * Total de seguidores a partir de las cifras de cada red. Las que no se
 * entiendan se ignoran en vez de tumbar el total: es preferible una suma
 * incompleta a un cero en la portada.
 */
export function sumarSeguidores(
  cifras: (string | null | undefined)[],
): { total: number; texto: string; ignoradas: number } {
  let total = 0;
  let ignoradas = 0;
  for (const c of cifras) {
    const n = aNumero(c);
    if (n === null) ignoradas++;
    else total += n;
  }
  return { total, texto: formatearTotal(total), ignoradas };
}
