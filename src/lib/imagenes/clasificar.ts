// Separa fotografías de gráficos de interfaz (iconos, logos, botones,
// sprites...). Heurística, no magia: formato + tamaño + aspecto + pistas en la
// ruta. El objetivo es que el filtro "Fotos" enseñe lo que alguien querría
// descargar de un artículo y esconda la tornillería de la web.

export type CategoriaImagen = "foto" | "grafico";

// Pistas en el nombre/ruta que delatan tornillería de UI. "avatar" cuenta
// como gráfico: en la práctica son miniaturas de perfil, no fotos de nota.
const RE_RUTA_GRAFICO =
  /(favicon|icon|logo|sprite|badge|button|boton|emoji|placeholder|avatar|thumb-?nail-?default|spinner|loader|arrow|flecha|bullet)/i;

export function clasificarImagen(img: {
  url: string;
  formato: string | null;
  ancho: number | null;
  alto: number | null;
}): CategoriaImagen {
  // SVG es dibujo vectorial por definición: logos, iconos, fuentes.
  if (img.formato === "svg") return "grafico";

  let ruta = "";
  try {
    ruta = new URL(img.url).pathname;
  } catch {
    ruta = img.url;
  }
  if (RE_RUTA_GRAFICO.test(ruta)) return "grafico";

  if (img.ancho && img.alto) {
    const mayor = Math.max(img.ancho, img.alto);
    const aspecto = img.ancho / img.alto;
    // Pequeño = icono/botón; aspecto extremo = tira, separador o banner.
    if (mayor < 200) return "grafico";
    if (aspecto > 4.5 || aspecto < 1 / 4.5) return "grafico";
    // PNG/GIF medianos suelen ser gráficos (los fotógrafos no publican PNG);
    // a partir de ~500px les damos el beneficio de la duda (capturas, carteles).
    if ((img.formato === "png" || img.formato === "gif") && mayor < 500)
      return "grafico";
    return "foto";
  }

  // Sin dimensiones conocidas decide el formato: jpeg/webp/avif huelen a foto.
  return img.formato === "jpeg" || img.formato === "webp" || img.formato === "avif"
    ? "foto"
    : "grafico";
}
