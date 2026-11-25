/**
 * Color del césped de la pizarra (25-nov-2026). Antes era #10271c, un verde
 * casi negro: un usuario se quejó de que se veía muy oscuro. Ahora es verde
 * de campo con franjas de corte, y las líneas blancas siguen leyéndose bien
 * (contraste blanco sobre CESPED ≈ 5:1).
 *
 * Lo usan la pizarra (globals.css repite estos dos valores, .pz-campo), la
 * imagen que se descarga, la imagen para compartir y las miniaturas de la
 * comunidad.
 */
export const CESPED = "#2e7d3e";
export const CESPED_FRANJA = "#287036";
/** Número de franjas de corte a lo largo del campo. */
export const FRANJAS = 10;
