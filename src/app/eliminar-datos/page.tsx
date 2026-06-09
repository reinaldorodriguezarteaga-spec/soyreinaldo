export const metadata = {
  title: "Eliminar mis datos | Soy Reinaldo",
  description:
    "Cómo solicitar la eliminación de tu cuenta y todos los datos asociados en soyreinaldo.com.",
};

const MAILTO =
  "mailto:hola@soyreinaldo.com?subject=Eliminar%20mi%20cuenta&body=Hola%20Reinaldo%2C%0A%0ASolicito%20la%20eliminaci%C3%B3n%20completa%20de%20mi%20cuenta%20y%20datos%20asociados.%0A%0AEmail%20de%20la%20cuenta%3A%20%5BPONLO%20AQU%C3%8D%5D%0A%0AGracias.";

export default function EliminarDatosPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Privacidad</p>
          <h1 className="phero__title">
            Eliminar mis datos<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Si quieres que borre tu cuenta y todos los datos personales
            asociados a ella, sigue las instrucciones de abajo. Es gratis y no
            necesitas justificarlo.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="legal">
            <section>
              <h2>Cómo solicitarlo</h2>
              <ol>
                <li>
                  Envía un email a{" "}
                  <a href={MAILTO}>
                    <strong>hola@soyreinaldo.com</strong>
                  </a>{" "}
                  con el asunto <strong>&quot;Eliminar mi cuenta&quot;</strong>.
                </li>
                <li>
                  Indica el <strong>email con el que te registraste</strong> en
                  la web (si te registraste con Google o Facebook, indica el
                  email asociado a esa cuenta).
                </li>
                <li>
                  Te confirmaré por email cuando haya completado el borrado.
                </li>
              </ol>
            </section>

            <section>
              <h2>Qué se elimina</h2>
              <ul>
                <li>Tu cuenta de usuario y credenciales.</li>
                <li>Tu nombre y email.</li>
                <li>Tus predicciones de la quiniela.</li>
                <li>Cualquier dato vinculado a tu perfil.</li>
              </ul>
            </section>

            <section>
              <h2>Qué puede no eliminarse</h2>
              <p>
                Si has hecho alguna donación a través de Stripe, los registros
                de la transacción pueden conservarse durante el plazo que la ley
                fiscal exige (normalmente entre 4 y 6 años). Esto es una
                obligación legal y no depende de mí. El resto de tus datos sí se
                elimina por completo.
              </p>
            </section>

            <section>
              <h2>Plazos</h2>
              <p>
                Atiendo las solicitudes en un máximo de <strong>30 días</strong>
                , normalmente mucho antes. Si pasados 30 días no has tenido
                respuesta, escríbeme de nuevo o presenta una reclamación ante la{" "}
                <a
                  href="https://www.aepd.es/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Agencia Española de Protección de Datos
                </a>
                .
              </p>
            </section>

            <section>
              <h2>Más información</h2>
              <p>
                Para conocer todos tus derechos sobre tus datos, lee la{" "}
                <a href="/privacidad">Política de Privacidad</a>.
              </p>
            </section>
          </div>

          <div className="brandband" style={{ marginTop: 40 }}>
            <p className="brandband__label">Hazlo ya</p>
            <h2
              className="display"
              style={{ fontSize: "2rem", margin: "10px 0 0" }}
            >
              ¿Quieres hacerlo ya?
            </h2>
            <p
              className="phero__lede"
              style={{ marginTop: 12, fontSize: "0.95rem" }}
            >
              Pulsa el botón y se abrirá tu cliente de email con el mensaje
              pre-redactado. Solo tienes que añadir tu email de registro y
              enviar.
            </p>
            <a
              href={MAILTO}
              className="btn btn--accent"
              style={{ marginTop: 20 }}
            >
              Solicitar eliminación por email <span className="arr">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
