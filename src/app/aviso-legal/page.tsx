import Link from "next/link";
import { CONTACTO_LEGAL, TITULAR } from "@/lib/legal";

export const metadata = {
  alternates: { canonical: "/aviso-legal" },
  title: "Aviso legal | Soy Reinaldo",
  description:
    "Datos del titular de soyreinaldo.com, condiciones de uso de la web, propiedad intelectual y responsabilidad.",
};

const lastUpdated = "21 de noviembre de 2026";

/** Aviso legal (21-nov-2026): lo exige el art. 10 de la LSSI-CE a toda web con
 * actividad económica (anuncios, asesorías de pago, donaciones). */
export default function AvisoLegalPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Legal</p>
          <h1 className="phero__title">
            Aviso legal<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Última actualización: {lastUpdated}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="legal">
            <section>
              <h2>1. Titular de la web</h2>
              <p>
                En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de
                la Información y de Comercio Electrónico (LSSI-CE), estos son los datos del
                titular de <strong>soyreinaldo.com</strong> y de sus apps para iPhone y Android:
              </p>
              <ul>
                <li>
                  <strong>Titular:</strong> {TITULAR.nombre}
                </li>
                <li>
                  <strong>NIF:</strong> {TITULAR.nif}
                </li>
                <li>
                  <strong>Domicilio:</strong> {TITULAR.domicilio}
                </li>
                <li>
                  <strong>Correo electrónico:</strong>{" "}
                  <a href={`mailto:${CONTACTO_LEGAL}`}>{CONTACTO_LEGAL}</a>
                </li>
                <li>
                  <strong>Actividad:</strong> creación de contenido sobre fútbol (análisis,
                  datos de competiciones, juegos y pronósticos), asesorías individuales de pago
                  y publicidad.
                </li>
              </ul>
            </section>

            <section>
              <h2>2. Condiciones de uso</h2>
              <p>
                Usar esta web te convierte en usuario y supone aceptar este aviso legal. Las
                condiciones de las cuentas, los juegos, los pronósticos y los servicios de pago
                están en los <Link href="/terminos">Términos del Servicio</Link>; cómo trato tus
                datos, en la <Link href="/privacidad">Política de Privacidad</Link>, y qué cookies
                uso, en la <Link href="/cookies">Política de Cookies</Link>.
              </p>
              <p>
                Te comprometes a usar la web de forma lícita y a no hacer nada que pueda dañarla,
                sobrecargarla o impedir que otros la usen, como descargar sus datos de forma
                automatizada.
              </p>
            </section>

            <section>
              <h2>3. Propiedad intelectual</h2>
              <p>
                Los textos, análisis, diseño, logotipos y código de la web son míos o los uso con
                permiso o con una licencia que lo permite. No puedes copiarlos, distribuirlos ni
                transformarlos con fines comerciales sin mi autorización por escrito. Sí puedes
                citarlos y compartir los enlaces indicando la fuente.
              </p>
              <p>
                Los nombres, escudos y marcas de clubes, competiciones y jugadores pertenecen a sus
                titulares y aparecen solo con fines informativos. Los datos deportivos (resultados,
                clasificaciones, estadísticas) proceden de proveedores externos.
              </p>
              <p>
                Si crees que algún contenido vulnera tus derechos, escríbeme a{" "}
                <a href={`mailto:${CONTACTO_LEGAL}`}>{CONTACTO_LEGAL}</a> y lo retiraré si
                procede.
              </p>
            </section>

            <section>
              <h2>4. Responsabilidad</h2>
              <p>
                Pongo cuidado en que la información sea correcta, pero los datos deportivos
                pueden tener retrasos o errores del proveedor, y los análisis son opiniones
                personales. No respondo de las decisiones que tomes basándote en ellos.
              </p>
              <p>
                La web puede dejar de estar disponible por mantenimiento o por causas ajenas a
                mí. Los comentarios y mensajes de los usuarios son responsabilidad de quien los
                escribe; retiraré los que sean ilícitos en cuanto tenga conocimiento de ellos.
              </p>
            </section>

            <section>
              <h2>5. Enlaces a otras webs</h2>
              <p>
                La web enlaza a redes sociales, vídeos y medios de terceros. No controlo su
                contenido ni respondo de él.
              </p>
            </section>

            <section>
              <h2>6. Ley aplicable</h2>
              <p>
                Este aviso legal se rige por la ley española. Para cualquier conflicto, y salvo
                que la ley disponga otra cosa, son competentes los juzgados y tribunales del
                domicilio del usuario si es consumidor, y en otro caso los de Madrid.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
