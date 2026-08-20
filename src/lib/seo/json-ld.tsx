export const SITE = "https://www.soyreinaldo.com";

/**
 * Datos estructurados (schema.org) para que Google entienda qué hay en la
 * página y pueda enseñarlo enriquecido en los resultados: un partido con su
 * marcador, un equipo, un jugador. Sin esto somos un texto más; con esto, una
 * ficha.
 *
 * Se inyecta como <script type="application/ld+json">. El JSON va escapado
 * para que un nombre con "</script>" no pueda romper la página.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** URL absoluta y canónica de una ruta interna. */
export function absolute(path: string): string {
  return `${SITE}${path}`;
}
