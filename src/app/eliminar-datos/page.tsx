import Link from "next/link";

export const metadata = {
  title: "Eliminar mis datos | Soy Reinaldo",
  description:
    "Cómo solicitar la eliminación de tu cuenta y todos los datos asociados en soyreinaldo.com.",
};

export default function EliminarDatosPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Privacidad
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Eliminar mis datos
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Si quieres que borre tu cuenta y todos los datos personales
            asociados a ella, sigue las instrucciones de abajo. Es gratis y
            no necesitas justificarlo.
          </p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed text-zinc-300">
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Cómo solicitarlo
            </h2>
            <ol className="space-y-4 pl-5 [list-style:decimal]">
              <li>
                Envía un email a{" "}
                <a
                  href="mailto:hola@soyreinaldo.com?subject=Eliminar%20mi%20cuenta&body=Hola%20Reinaldo%2C%0A%0ASolicito%20la%20eliminaci%C3%B3n%20completa%20de%20mi%20cuenta%20y%20datos%20asociados.%0A%0AEmail%20de%20la%20cuenta%3A%20%5BPONLO%20AQU%C3%8D%5D%0A%0AGracias."
                  className="font-semibold text-indigo-300 hover:text-indigo-200"
                >
                  hola@soyreinaldo.com
                </a>{" "}
                con el asunto{" "}
                <strong>&quot;Eliminar mi cuenta&quot;</strong>.
              </li>
              <li>
                Indica el <strong>email con el que te registraste</strong>{" "}
                en la web (si te registraste con Google o Facebook, indica
                el email asociado a esa cuenta).
              </li>
              <li>
                Te confirmaré por email cuando haya completado el borrado.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              Qué se elimina
            </h2>
            <ul className="space-y-2 pl-5 [list-style:disc]">
              <li>Tu cuenta de usuario y credenciales.</li>
              <li>Tu nombre y email.</li>
              <li>Tus predicciones de la quiniela.</li>
              <li>Cualquier dato vinculado a tu perfil.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              Qué puede no eliminarse
            </h2>
            <p>
              Si has hecho alguna donación a través de Stripe, los registros
              de la transacción pueden conservarse durante el plazo que la
              ley fiscal exige (normalmente entre 4 y 6 años). Esto es una
              obligación legal y no depende de mí. El resto de tus datos sí
              se elimina por completo.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Plazos</h2>
            <p>
              Atiendo las solicitudes en un máximo de{" "}
              <strong>30 días</strong>, normalmente mucho antes. Si pasados
              30 días no has tenido respuesta, escríbeme de nuevo o
              presenta una reclamación ante la{" "}
              <a
                href="https://www.aepd.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-indigo-200"
              >
                Agencia Española de Protección de Datos
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              Más información
            </h2>
            <p>
              Para conocer todos tus derechos sobre tus datos, lee la{" "}
              <Link
                href="/privacidad"
                className="text-indigo-300 hover:text-indigo-200"
              >
                Política de Privacidad
              </Link>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-zinc-950 to-zinc-950 p-6 sm:p-8">
          <h3 className="text-base font-semibold text-white">
            ¿Quieres hacerlo ya?
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Pulsa el botón de abajo y se abrirá tu cliente de email con el
            mensaje pre-redactado. Solo tienes que añadir tu email de
            registro y enviar.
          </p>
          <a
            href="mailto:hola@soyreinaldo.com?subject=Eliminar%20mi%20cuenta&body=Hola%20Reinaldo%2C%0A%0ASolicito%20la%20eliminaci%C3%B3n%20completa%20de%20mi%20cuenta%20y%20datos%20asociados.%0A%0AEmail%20de%20la%20cuenta%3A%20%5BPONLO%20AQU%C3%8D%5D%0A%0AGracias."
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Solicitar eliminación por email
            <span>→</span>
          </a>
        </div>
      </div>
    </main>
  );
}
