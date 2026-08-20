import { describe, expect, it } from "vitest";
import { markdownAHtml, aSlug, minutosDeLectura } from "../markdown";

describe("markdown a HTML", () => {
  it("convierte párrafos, negrita y cursiva", () => {
    const html = markdownAHtml("Esto es **importante** y esto *matiza*.");
    expect(html).toBe("<p>Esto es <strong>importante</strong> y esto <em>matiza</em>.</p>");
  });

  it("los títulos empiezan en h2, para no competir con el h1 de la página", () => {
    expect(markdownAHtml("# Titular")).toBe("<h2>Titular</h2>");
    expect(markdownAHtml("## Subtitular")).toBe("<h3>Subtitular</h3>");
  });

  it("agrupa las listas en un solo <ul>", () => {
    const html = markdownAHtml("- uno\n- dos");
    expect(html).toBe("<ul>\n<li>uno</li>\n<li>dos</li>\n</ul>");
  });

  it("entiende las citas", () => {
    expect(markdownAHtml("> Lo dijo él")).toBe("<blockquote>Lo dijo él</blockquote>");
  });

  it("los enlaces externos se abren fuera y sin filtrar referencia", () => {
    const html = markdownAHtml("[fuente](https://ejemplo.com)");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("los enlaces internos se quedan en la misma pestaña", () => {
    const html = markdownAHtml("[el partido](/liga/laliga/partido/1)");
    expect(html).toContain('<a href="/liga/laliga/partido/1">');
    expect(html).not.toContain("target");
  });
});

describe("seguridad del markdown", () => {
  it("no deja pasar etiquetas HTML", () => {
    const html = markdownAHtml("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("no deja inyectar atributos con comillas", () => {
    const html = markdownAHtml('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=\"");
  });

  it("ignora los enlaces javascript:", () => {
    const html = markdownAHtml("[pincha](javascript:alert(1))");
    // No se convierte en enlace: se queda como texto plano.
    expect(html).not.toContain("<a ");
  });

  it("escapa también dentro de negrita y títulos", () => {
    expect(markdownAHtml("# <b>hola</b>")).toContain("&lt;b&gt;");
    expect(markdownAHtml("**<i>x</i>**")).toContain("&lt;i&gt;");
  });
});

describe("enlaces y lectura", () => {
  it("hace slugs limpios sin acentos ni signos", () => {
    expect(aSlug("El Barça ¡no necesita un nueve!")).toBe("el-barca-no-necesita-un-nueve");
  });

  it("no deja guiones sueltos en los extremos", () => {
    expect(aSlug("  ¿Y ahora qué?  ")).toBe("y-ahora-que");
  });

  it("calcula minutos de lectura, mínimo uno", () => {
    expect(minutosDeLectura("dos palabras")).toBe(1);
    expect(minutosDeLectura("palabra ".repeat(400))).toBe(2);
  });
});
