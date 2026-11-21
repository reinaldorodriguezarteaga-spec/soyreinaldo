import Link from "next/link";
import { T } from "@/components/EnApp";
import { CONTACTO_LEGAL, TITULAR } from "@/lib/legal";

export const metadata = {
  alternates: { canonical: "/privacidad" },
  title: "Política de Privacidad | Soy Reinaldo",
  description:
    "Cómo trato tus datos personales en soyreinaldo.com y sus apps: qué recojo, para qué, con qué base legal, quién más los trata y tus derechos.",
};

const lastUpdated = "21 de noviembre de 2026";

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function PrivacidadPage() {
  const correo = <a href={`mailto:${CONTACTO_LEGAL}`}>{CONTACTO_LEGAL}</a>;
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Legal</p>
          <h1 className="phero__title">
            Política de Privacidad<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Última actualización: {lastUpdated}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="legal">
            <section>
              <h2>1. Responsable</h2>
              <p>
                El responsable de tus datos en <strong>soyreinaldo.com</strong> y en sus apps
                para iPhone y Android es <strong>{TITULAR.nombre}</strong> (en adelante
                &quot;yo&quot;), NIF {TITULAR.nif}, con domicilio en {TITULAR.domicilio}.
                Contacto: {correo}.
              </p>
            </section>

            <section>
              <h2>2. Qué datos recojo</h2>
              <ul>
                <li>
                  <strong>Datos de tu cuenta</strong>: email, nombre de usuario y, si entras con
                  Google, Facebook o Apple, el nombre y la foto de perfil que te den esos
                  servicios.
                </li>
                <li>
                  <strong>Lo que haces en la web</strong>: <T>tus pronósticos de la quiniela</T>,
                  tus partidas de los juegos, tus equipos favoritos y los comentarios que
                  publicas.
                </li>
                <li>
                  <strong>Pagos</strong>: si contratas una asesoría o haces una donación, Stripe
                  cobra el pago y yo solo veo el importe, la fecha, tu nombre y tu email.{" "}
                  <strong>Nunca</strong> recibo ni guardo los datos de tu tarjeta.
                </li>
                <li>
                  <strong>Avisos</strong>: si activas las notificaciones, guardo el identificador
                  que tu navegador o tu móvil da para enviártelas.
                </li>
                <li>
                  <strong>Datos técnicos</strong>: dirección IP, tipo de navegador y páginas
                  visitadas, que se registran automáticamente para que la web funcione y para
                  frenar abusos.
                </li>
                <li>
                  <strong>Publicidad</strong>: si aceptas las cookies de publicidad, Google
                  recoge datos de tu navegación para mostrarte anuncios (ver el punto 5 y la{" "}
                  <Link href="/cookies">Política de Cookies</Link>).
                </li>
              </ul>
            </section>

            <section>
              <h2>3. Para qué los uso y con qué base legal</h2>
              <ul>
                <li>
                  <strong>Darte el servicio</strong> (tu cuenta,{" "}
                  <T>la quiniela</T>, los juegos, los comentarios, las asesorías que contratas):
                  porque es necesario para cumplir lo que acordamos al registrarte (art. 6.1.b
                  del RGPD).
                </li>
                <li>
                  <strong>Enviarte emails imprescindibles</strong> (confirmar tu cuenta,
                  recuperar la contraseña, el recibo de un pago): por la misma razón.
                </li>
                <li>
                  <strong>Enviarte avisos</strong> de partidos y recordatorios: solo si los
                  activas, con tu consentimiento (art. 6.1.a). Los puedes desactivar cuando
                  quieras.
                </li>
                <li>
                  <strong>Mostrarte anuncios</strong> personalizados: solo con tu consentimiento,
                  que das o niegas en el aviso de cookies.
                </li>
                <li>
                  <strong>Mantener la web segura</strong> y evitar abusos: por mi interés legítimo
                  en que funcione (art. 6.1.f).
                </li>
                <li>
                  <strong>Cumplir obligaciones legales</strong>, como guardar las facturas de los
                  pagos (art. 6.1.c).
                </li>
              </ul>
              <p>
                <strong>No vendo tus datos</strong> y no te envío publicidad por email.
              </p>
            </section>

            <section>
              <h2>4. Quién más trata tus datos</h2>
              <p>
                Uso estos proveedores, que tratan los datos por mi cuenta y con sus propias
                garantías:
              </p>
              <ul>
                <li>
                  <strong>Supabase</strong>: base de datos y cuentas, con servidores en la Unión
                  Europea (Irlanda).{" "}
                  <a href="https://supabase.com/privacy" {...ext}>
                    Política
                  </a>
                </li>
                <li>
                  <strong>Vercel</strong>: alojamiento de la web y estadísticas de visitas sin
                  cookies.{" "}
                  <a href="https://vercel.com/legal/privacy-policy" {...ext}>
                    Política
                  </a>
                </li>
                <li>
                  <strong>Resend</strong>: envío de los emails.{" "}
                  <a href="https://resend.com/legal/privacy-policy" {...ext}>
                    Política
                  </a>
                </li>
                <li>
                  <strong>Stripe</strong>: cobro de asesorías y donaciones.{" "}
                  <a href="https://stripe.com/privacy" {...ext}>
                    Política
                  </a>
                </li>
                <li>
                  <strong>Google, Meta (Facebook) y Apple</strong>: solo si eliges entrar con su
                  botón; me pasan tu nombre, email y foto de perfil.{" "}
                  <a href="https://policies.google.com/privacy" {...ext}>
                    Google
                  </a>{" "}
                  ·{" "}
                  <a href="https://www.facebook.com/privacy/policy" {...ext}>
                    Meta
                  </a>{" "}
                  ·{" "}
                  <a href="https://www.apple.com/es/legal/privacy/" {...ext}>
                    Apple
                  </a>
                </li>
                <li>
                  <strong>Google, Apple y los fabricantes de navegadores</strong>: entregan los
                  avisos si los activas (Firebase Cloud Messaging, Apple Push Notification
                  service y los servicios de notificaciones de cada navegador).
                </li>
              </ul>
            </section>

            <section>
              <h2>5. Publicidad de Google AdSense</h2>
              <p>
                La web muestra anuncios de <strong>Google AdSense</strong>. Google, como
                responsable independiente, y sus socios publicitarios pueden usar cookies e
                identificadores para mostrar anuncios, medirlos y, si lo aceptas,
                personalizarlos según tus intereses. Tú decides en el aviso de cookies que sale
                al entrar, y puedes cambiar de opinión desde la{" "}
                <Link href="/cookies">Política de Cookies</Link>.
              </p>
              <p>
                Más información en{" "}
                <a href="https://policies.google.com/technologies/partner-sites" {...ext}>
                  cómo usa Google los datos de los sitios que usan sus servicios
                </a>{" "}
                y en su{" "}
                <a href="https://policies.google.com/privacy" {...ext}>
                  política de privacidad
                </a>
                . Las apps de iPhone y Android no muestran anuncios.
              </p>
            </section>

            <section>
              <h2>6. Transferencias fuera de la Unión Europea</h2>
              <p>
                Algunos de esos proveedores (Vercel, Resend, Stripe, Google, Meta y Apple) son
                de Estados Unidos. Las transferencias se hacen con las garantías del RGPD: el
                Marco de Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo de la
                Comisión Europea.
              </p>
            </section>

            <section>
              <h2>7. Cuánto tiempo guardo tus datos</h2>
              <p>
                Mientras tu cuenta exista. Si la borras, elimino tus datos en un plazo máximo de
                30 días, salvo lo que la ley me obligue a conservar: los datos de los pagos se
                guardan el tiempo que exige la normativa fiscal (en general, 4 años). Los
                registros técnicos se borran solos en pocas semanas.
              </p>
            </section>

            <section>
              <h2>8. Tus derechos</h2>
              <p>Según el Reglamento General de Protección de Datos (RGPD) puedes:</p>
              <ul>
                <li>Acceder a los datos que tengo sobre ti.</li>
                <li>Rectificarlos si son incorrectos.</li>
                <li>Pedir que los borre.</li>
                <li>Oponerte a que los trate o pedir que limite su uso.</li>
                <li>Recibirlos en un formato que puedas llevarte a otro servicio.</li>
                <li>Retirar tu consentimiento cuando quieras, sin que afecte a lo anterior.</li>
              </ul>
              <p>
                Para ejercerlos escríbeme a {correo}; te respondo en menos de un mes. Para borrar
                tu cuenta también puedes seguir las instrucciones de{" "}
                <Link href="/eliminar-datos">Eliminar mis datos</Link>.
              </p>
              <p>
                Si crees que no he tratado bien tus datos, puedes reclamar ante la{" "}
                <a href="https://www.aepd.es/" {...ext}>
                  Agencia Española de Protección de Datos (AEPD)
                </a>
                .
              </p>
            </section>

            <section>
              <h2>9. Cookies</h2>
              <p>
                Uso cookies necesarias para la sesión y la seguridad y, si las aceptas, cookies de
                publicidad de Google. El detalle está en la{" "}
                <Link href="/cookies">Política de Cookies</Link>.
              </p>
            </section>

            <section>
              <h2>10. Menores de edad</h2>
              <p>
                La web está pensada para mayores de 14 años. Si eres menor, pide permiso a tu
                madre, padre o tutor antes de crear una cuenta o hacer un pago.
              </p>
            </section>

            <section>
              <h2>11. Cambios en esta política</h2>
              <p>
                Si la cambio, actualizaré la fecha del principio. Si el cambio es importante, te
                avisaré por email cuando sea posible.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
