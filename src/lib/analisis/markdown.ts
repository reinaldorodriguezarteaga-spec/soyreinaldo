/**
 * Markdown mínimo, sin dependencias.
 *
 * Solo hay un autor —el admin del sitio— así que no hace falta un motor
 * completo. Lo que sí hace falta es que sea seguro por construcción: **primero
 * se escapa TODO el HTML** y solo después se aplican las marcas. Así, escribas
 * lo que escribas, no puede colarse una etiqueta.
 *
 * Admite lo que se usa escribiendo de fútbol: títulos, negrita, cursiva,
 * enlaces, listas, citas y párrafos. Nada más, a propósito.
 */

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Marcas dentro de una línea: negrita, cursiva, código y enlaces. */
function enLinea(texto: string): string {
  return texto
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Solo enlaces http(s) o internos: nada de javascript:
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      (_m, texto2, url) =>
        url.startsWith("/")
          ? `<a href="${url}">${texto2}</a>`
          : `<a href="${url}" target="_blank" rel="noopener noreferrer">${texto2}</a>`,
    );
}

export function markdownAHtml(markdown: string): string {
  const lineas = escapar(markdown.replace(/\r\n/g, "\n")).split("\n");
  const salida: string[] = [];
  let enLista = false;
  let parrafo: string[] = [];

  const cerrarParrafo = () => {
    if (parrafo.length > 0) {
      salida.push(`<p>${enLinea(parrafo.join(" "))}</p>`);
      parrafo = [];
    }
  };
  const cerrarLista = () => {
    if (enLista) {
      salida.push("</ul>");
      enLista = false;
    }
  };

  for (const linea of lineas) {
    const l = linea.trim();

    if (l === "") {
      cerrarParrafo();
      cerrarLista();
      continue;
    }

    const titulo = l.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      const nivel = titulo[1].length + 1; // # → h2, para no competir con el h1
      salida.push(`<h${nivel}>${enLinea(titulo[2])}</h${nivel}>`);
      continue;
    }

    const item = l.match(/^[-*]\s+(.*)$/);
    if (item) {
      cerrarParrafo();
      if (!enLista) {
        salida.push("<ul>");
        enLista = true;
      }
      salida.push(`<li>${enLinea(item[1])}</li>`);
      continue;
    }

    const cita = l.match(/^&gt;\s*(.*)$/);
    if (cita) {
      cerrarParrafo();
      cerrarLista();
      salida.push(`<blockquote>${enLinea(cita[1])}</blockquote>`);
      continue;
    }

    parrafo.push(l);
  }

  cerrarParrafo();
  cerrarLista();
  return salida.join("\n");
}

/** Título → slug para la URL. */
export function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Minutos de lectura, redondeados hacia arriba. */
export function minutosDeLectura(markdown: string): number {
  const palabras = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(palabras / 200));
}
