import Link from "next/link";
import CambiarCookies from "@/components/CambiarCookies";
import { CONTACTO_LEGAL, TITULAR } from "@/lib/legal";

export const metadata = {
  alternates: { canonical: "/cookies" },
  title: "Política de Cookies | Soy Reinaldo",
  description:
    "Qué cookies usa soyreinaldo.com (sesión, seguridad y publicidad de Google AdSense), para qué sirven y cómo cambiar tu elección.",
};

const lastUpdated = "25 de noviembre de 2026";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/** Política de cookies (21-nov-2026): la pide la LSSI-CE (art. 22.2) y Google
 * para servir anuncios de AdSense en Europa. */
export default function CookiesPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Legal</p>
          <h1 className="phero__title">
            Política de Cookies<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Última actualización: {lastUpdated}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="legal">
            <section>
              <h2>1. Qué son las cookies</h2>
              <p>
                Son pequeños archivos que una web guarda en tu navegador para recordar
                información entre visitas, como que has iniciado sesión. Esta política explica
                cuáles usa <strong>soyreinaldo.com</strong>, cuyo responsable es{" "}
                {TITULAR.nombre} (más datos en el <Link href="/aviso-legal">aviso legal</Link>).
              </p>
            </section>

            <section>
              <h2>2. Cookies necesarias (no piden permiso)</h2>
              <p>Sin ellas la web no funciona, así que no se pueden desactivar desde el aviso:</p>
              <div className="legal__tabla">
                <table>
                  <thead>
                    <tr>
                      <th>Cookie</th>
                      <th>De quién</th>
                      <th>Para qué</th>
                      <th>Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>sb-…</code>
                      </td>
                      <td>Propia (Supabase)</td>
                      <td>Mantener tu sesión iniciada.</td>
                      <td>Hasta que cierras sesión</td>
                    </tr>
                    <tr>
                      <td>
                        <code>sr_ok</code>
                      </td>
                      <td>Propia</td>
                      <td>Distinguir a las personas de los robots que copian datos de la web.</td>
                      <td>30 días</td>
                    </tr>
                    <tr>
                      <td>
                        <code>FCCDCF</code>, <code>FCNEC</code>
                      </td>
                      <td>Google</td>
                      <td>Guardar lo que eliges en el aviso de cookies.</td>
                      <td>Hasta 13 meses</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                La web también guarda en tu navegador (almacenamiento local, no cookies) algunas
                preferencias: tu elección en el aviso de cookies, las partidas de los juegos del
                día y los avisos que ya cerraste. No salen de tu dispositivo.
              </p>
            </section>

            <section>
              <h2>3. Cookies de publicidad (solo si las aceptas)</h2>
              <p>
                La web se financia con anuncios de <strong>Google AdSense</strong>. Si das tu
                consentimiento, Google y sus socios publicitarios usan cookies (por ejemplo{" "}
                <code>__gads</code>, <code>__gpi</code>, <code>__eoi</code> o <code>IDE</code>)
                para mostrarte anuncios, medir cuántas veces se ven y, si lo permites,
                personalizarlos según tus intereses. Duran hasta 13 meses.
              </p>
              <p>
                Si no las aceptas, Google puede mostrar anuncios no personalizados, que usan
                cookies solo para limitar cuántas veces ves un anuncio y para evitar fraudes.
              </p>
              <p>
                Más información en{" "}
                <a href="https://policies.google.com/technologies/partner-sites" {...ext}>
                  cómo usa Google la información de los sitios que usan sus servicios
                </a>{" "}
                y en{" "}
                <a href="https://policies.google.com/technologies/ads" {...ext}>
                  cómo usa Google las cookies en publicidad
                </a>
                . Puedes gestionar la personalización de los anuncios de Google en{" "}
                <a href="https://adssettings.google.com/" {...ext}>
                  Mi centro de anuncios
                </a>
                .
              </p>
            </section>

            <section>
              <h2>4. Estadísticas sin cookies</h2>
              <p>
                Para saber cuántas visitas tiene cada página uso Vercel Web Analytics, que no
                instala cookies ni te identifica: cuenta visitas de forma agregada.
              </p>
            </section>

            <section>
              <h2>5. Contenido de terceros</h2>
              <p>
                Algunas páginas incluyen vídeos de YouTube. El reproductor solo se carga cuando
                pulsas el vídeo; a partir de ese momento YouTube (Google) puede usar sus propias
                cookies, según su{" "}
                <a href="https://policies.google.com/privacy" {...ext}>
                  política de privacidad
                </a>
                .
              </p>
            </section>

            <section>
              <h2>6. Cómo cambiar tu elección</h2>
              <p>
                La primera vez que entras te pregunto si aceptas las cookies de publicidad.
                Puedes cambiar de opinión cuando quieras:
              </p>
              <p>
                <CambiarCookies />
              </p>
              <p>
                También puedes borrar o bloquear las cookies desde la configuración de tu
                navegador (
                <a href="https://support.google.com/chrome/answer/95647" {...ext}>
                  Chrome
                </a>
                ,{" "}
                <a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" {...ext}>
                  Safari
                </a>
                ,{" "}
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  {...ext}
                >
                  Firefox
                </a>
                ,{" "}
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  {...ext}
                >
                  Edge
                </a>
                ). Si bloqueas las necesarias, no podrás iniciar sesión.
              </p>
            </section>

            <section>
              <h2>7. Dentro de las apps</h2>
              <p>
                Las apps de iPhone y Android no usan cookies de publicidad: solo las necesarias
                para la sesión. Desde la versión 1.3 muestran anuncios de{" "}
                <strong>Google AdMob</strong>, que usa el identificador de publicidad de tu
                móvil. Al abrir la app te pregunta si das tu permiso (y, en el iPhone, también
                lo pregunta Apple). Sin permiso ves anuncios igual, pero no personalizados.
                Puedes cambiar tu elección dentro de la app con el botón de arriba.
              </p>
            </section>

            <section>
              <h2>8. Contacto</h2>
              <p>
                Cualquier duda sobre esta política, escríbeme a{" "}
                <a href={`mailto:${CONTACTO_LEGAL}`}>{CONTACTO_LEGAL}</a>. Cómo trato tus datos
                lo explico en la <Link href="/privacidad">Política de Privacidad</Link>.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
