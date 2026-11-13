import { EXPLICACIONES } from "@/lib/juegos/explicaciones";

/**
 * Reglas, puntos y origen de los datos bajo cada juego. Texto en el HTML del
 * servidor: es lo que lee Google (ver `lib/juegos/explicaciones.ts`).
 */
export default function ComoSeJuega({ juego, nombre }: { juego: string; nombre: string }) {
  const e = EXPLICACIONES[juego];
  if (!e) return null;
  return (
    <section className="csj" aria-labelledby={`csj-${juego}`}>
      <h2 id={`csj-${juego}`}>Cómo se juega a {nombre}</h2>
      <ol>
        {e.pasos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ol>
      <h3>Puntos</h3>
      <p>{e.puntos}</p>
      <h3>De dónde salen los datos</h3>
      <p>{e.datos}</p>
      {e.consejo && (
        <>
          <h3>Un consejo</h3>
          <p>{e.consejo}</p>
        </>
      )}
    </section>
  );
}
