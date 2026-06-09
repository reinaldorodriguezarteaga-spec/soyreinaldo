export const metadata = {
  title: "Política de Privacidad | Soy Reinaldo",
  description:
    "Cómo trato tus datos personales en soyreinaldo.com. Información clara sobre qué recopilo, para qué y tus derechos.",
};

const lastUpdated = "28 de abril de 2026";

export default function PrivacidadPage() {
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
              <h2>1. Quién soy</h2>
              <p>
                Esta web es un proyecto personal de{" "}
                <strong>Reinaldo Rodríguez</strong> (en adelante
                &quot;yo&quot;). Contacto:{" "}
                <a href="mailto:hola@soyreinaldo.com">hola@soyreinaldo.com</a>.
              </p>
            </section>

            <section>
              <h2>2. Qué datos recopilo</h2>
              <p>Solo recopilo los datos mínimos para que la web funcione:</p>
              <ul>
                <li>
                  <strong>Email y nombre</strong> — al crear una cuenta o
                  iniciar sesión con Google/Facebook.
                </li>
                <li>
                  <strong>Predicciones de la quiniela</strong> — los resultados
                  que pronosticas para el Mundial 2026.
                </li>
                <li>
                  <strong>Datos de donaciones</strong> — si haces una donación
                  voluntaria, Stripe procesa el pago y yo solo veo importe,
                  fecha y email asociado. <strong>Nunca</strong> recibo ni
                  almaceno datos de tu tarjeta.
                </li>
                <li>
                  <strong>Datos técnicos básicos</strong> — IP, tipo de
                  navegador y páginas visitadas, recogidos automáticamente para
                  mantener la web operativa y prevenir abuso.
                </li>
              </ul>
            </section>

            <section>
              <h2>3. Para qué los uso</h2>
              <ul>
                <li>Crear y gestionar tu cuenta.</li>
                <li>
                  Mostrar tus predicciones en la clasificación de la quiniela.
                </li>
                <li>
                  Enviarte emails imprescindibles (confirmación, recuperar
                  contraseña).
                </li>
                <li>Procesar donaciones que tú decides hacer.</li>
                <li>Mantener la web segura y funcionando.</li>
              </ul>
              <p>
                <strong>No vendo tus datos.</strong> No los comparto con
                terceros para publicidad. No te envío newsletters salvo que tú
                lo pidas explícitamente.
              </p>
            </section>

            <section>
              <h2>4. Quién más procesa tus datos</h2>
              <p>
                Para que la web funcione uso los siguientes servicios. Cada uno
                tiene su propia política de privacidad:
              </p>
              <ul>
                <li>
                  <strong>Supabase</strong> — base de datos y autenticación.{" "}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política
                  </a>
                </li>
                <li>
                  <strong>Vercel</strong> — hosting de la web.{" "}
                  <a
                    href="https://vercel.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política
                  </a>
                </li>
                <li>
                  <strong>Resend</strong> — envío de emails transaccionales.{" "}
                  <a
                    href="https://resend.com/legal/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política
                  </a>
                </li>
                <li>
                  <strong>Stripe</strong> — pasarela de pago para donaciones.{" "}
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Política
                  </a>
                </li>
                <li>
                  <strong>Google y Meta (Facebook)</strong> — solo si eliges
                  iniciar sesión con su botón. En ese caso me transmiten tu
                  nombre, email y foto de perfil pública.{" "}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google
                  </a>{" "}
                  ·{" "}
                  <a
                    href="https://www.facebook.com/privacy/policy"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Meta
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2>5. Cuánto tiempo guardo tus datos</h2>
              <p>
                Mientras tu cuenta exista. Si me pides eliminarla, borro tus
                datos en un plazo máximo de 30 días, salvo lo que la ley me
                obligue a conservar (por ejemplo, registros fiscales si has
                hecho alguna donación, durante el plazo legal aplicable).
              </p>
            </section>

            <section>
              <h2>6. Tus derechos</h2>
              <p>
                Bajo el Reglamento General de Protección de Datos (RGPD) tienes
                derecho a:
              </p>
              <ul>
                <li>Acceder a los datos que tengo sobre ti.</li>
                <li>Rectificarlos si son incorrectos.</li>
                <li>Eliminarlos (&quot;derecho al olvido&quot;).</li>
                <li>Exportarlos en un formato legible (portabilidad).</li>
                <li>Retirar tu consentimiento en cualquier momento.</li>
              </ul>
              <p>
                Para ejercer cualquiera de ellos, escríbeme a{" "}
                <a href="mailto:hola@soyreinaldo.com">hola@soyreinaldo.com</a>.
                Te respondo en menos de 30 días. Para borrar tu cuenta también
                puedes seguir las instrucciones en{" "}
                <a href="/eliminar-datos">/eliminar-datos</a>.
              </p>
              <p>
                Si crees que no he tratado tus datos correctamente, puedes
                presentar una reclamación ante la{" "}
                <a
                  href="https://www.aepd.es/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Agencia Española de Protección de Datos (AEPD)
                </a>
                .
              </p>
            </section>

            <section>
              <h2>7. Cookies</h2>
              <p>
                Solo uso cookies estrictamente necesarias para que la sesión
                funcione (saber si estás logueado). No uso cookies de publicidad
                ni de seguimiento de terceros.
              </p>
            </section>

            <section>
              <h2>8. Menores de edad</h2>
              <p>
                La web está pensada para mayores de 14 años. Si eres menor, pide
                permiso a tu madre, padre o tutor antes de crear cuenta o hacer
                cualquier donación.
              </p>
            </section>

            <section>
              <h2>9. Cambios en esta política</h2>
              <p>
                Si modifico esta política, actualizaré la fecha al inicio del
                documento. Para cambios importantes te avisaré por email cuando
                sea posible.
              </p>
            </section>

            <section>
              <h2>10. Contacto</h2>
              <p>
                Cualquier duda escríbeme a{" "}
                <a href="mailto:hola@soyreinaldo.com">hola@soyreinaldo.com</a>.
                Intento responder rápido.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
