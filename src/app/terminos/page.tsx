import Link from "next/link";
import { T } from "@/components/EnApp";

export const metadata = {
  title: "Términos del Servicio | Soy Reinaldo",
  description:
    "Las condiciones para usar soyreinaldo.com y sus apps: cuentas, juegos y ligas de pronósticos, datos deportivos, servicios de pago y normas de uso.",
};

const lastUpdated = "5 de noviembre de 2026";

/** Términos del Servicio (5-nov-2026): los pide Google Play para la
 * declaración de «operador» (comerciante) y sirven para la web y las apps. */
export default function TerminosPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Legal</p>
          <h1 className="phero__title">
            Términos del Servicio<span className="dot">.</span>
          </h1>
          <p className="phero__lede">Última actualización: {lastUpdated}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 760 }}>
          <div className="legal">
            <section>
              <h2>1. Quién presta el servicio</h2>
              <p>
                Soy Reinaldo (la web <strong>soyreinaldo.com</strong> y sus apps para iPhone y
                Android) es un proyecto de <strong>Reinaldo Rodríguez</strong> (en adelante
                &quot;yo&quot;). Contacto:{" "}
                <a href="mailto:hola@soyreinaldo.com">hola@soyreinaldo.com</a>.
              </p>
              <p>
                Al usar la web o las apps aceptas estos términos. Si no estás de acuerdo, no
                las uses. El tratamiento de tus datos se explica aparte, en la{" "}
                <Link href="/privacidad">Política de Privacidad</Link>.
              </p>
            </section>

            <section>
              <h2>2. Qué ofrece Soy Reinaldo</h2>
              <ul>
                <li>Marcadores, calendarios, clasificaciones y fichas de equipos y jugadores.</li>
                <li>Análisis y contenido propio sobre fútbol.</li>
                <li>
                  Juegos y <T>ligas de pronósticos (quinielas)</T> gratuitas entre aficionados.
                </li>
                <li>Herramientas como la pizarra táctica y el comparador.</li>
                <li>
                  En la web, además, asesorías de pago y la opción de hacer una donación
                  voluntaria.
                </li>
              </ul>
              <p>La mayor parte del servicio es gratuita y puede usarse sin cuenta.</p>
            </section>

            <section>
              <h2>3. Tu cuenta</h2>
              <ul>
                <li>
                  Para jugar, guardar favoritos o participar en ligas necesitas una cuenta. Debes
                  tener al menos <strong>14 años</strong>.
                </li>
                <li>
                  Los datos que pongas deben ser ciertos y eres responsable de lo que se haga con
                  tu cuenta. Guarda bien tu contraseña.
                </li>
                <li>
                  Tu nombre de usuario y tus puntos se ven en las clasificaciones de las ligas
                  en las que participas.
                </li>
                <li>
                  Puedes borrar tu cuenta cuando quieras desde tu perfil o siguiendo{" "}
                  <Link href="/eliminar-datos">estas instrucciones</Link>.
                </li>
              </ul>
            </section>

            <section>
              <h2>4. Juegos y ligas de pronósticos</h2>
              <ul>
                <li>
                  Son <strong>gratuitos y solo por diversión</strong>. No se apuesta dinero, no
                  hay cuotas ni se paga por participar.
                </li>
                <li>
                  Si alguna vez hay un premio o un sorteo, sus bases se publican aparte y son las
                  que mandan para ese concurso.
                </li>
                <li>
                  La puntuación sigue las reglas de cada liga, que se explican en la propia liga.
                  Quien administra una liga privada puede gestionar quién participa en ella.
                </li>
                <li>
                  Si detecto trampas (cuentas duplicadas, automatismos, aprovechar un fallo),
                  puedo anular esos puntos o excluir a quien las haga.
                </li>
              </ul>
            </section>

            <section>
              <h2>5. Normas de uso</h2>
              <p>Al usar la web, las apps, los chats de las ligas o cualquier zona abierta:</p>
              <ul>
                <li>Nada de insultos, acoso, contenido de odio, violento o sexual.</li>
                <li>Nada de spam, publicidad no autorizada ni suplantar a otras personas.</li>
                <li>
                  No copies los datos de la web de forma masiva ni con programas automáticos, y
                  no intentes saltarte sus protecciones.
                </li>
                <li>Respeta los derechos de otras personas y la ley.</li>
              </ul>
              <p>
                Puedo borrar el contenido que no cumpla estas normas y suspender o cerrar las
                cuentas que las incumplan. Si ves algo así, avísame con «Reportar un fallo» o en{" "}
                <a href="mailto:hola@soyreinaldo.com">hola@soyreinaldo.com</a>.
              </p>
            </section>

            <section>
              <h2>6. Datos deportivos</h2>
              <p>
                Los resultados, estadísticas, alineaciones y fotos de jugadores vienen de
                proveedores externos de datos deportivos. Pongo cuidado en que sean correctos,
                pero pueden tener errores o retrasos. Se ofrecen como información y{" "}
                <strong>no deben usarse para apostar</strong>. Si ves un dato mal, puedes
                avisarme con el botón «Reportar un fallo».
              </p>
            </section>

            <section>
              <h2>7. Propiedad intelectual</h2>
              <p>
                Los textos, análisis, diseños, la marca Soy Reinaldo y el código de la web son
                míos. Puedes compartirlos enlazando a la web, pero no copiarlos ni reutilizarlos
                con fines comerciales sin permiso. Los nombres, escudos y marcas de clubes y
                competiciones pertenecen a sus dueños y se usan solo para identificarlos.
              </p>
            </section>

            <section>
              <h2>8. Servicios de pago y donaciones (solo en la web)</h2>
              <ul>
                <li>
                  Los pagos se hacen a través de <strong>Stripe</strong>. Yo nunca veo ni guardo
                  los datos de tu tarjeta.
                </li>
                <li>
                  El precio y lo que incluye cada asesoría se indican antes de pagar. La cita se
                  puede cambiar hasta 24 horas antes. Si no puedo hacerla por un motivo mío, te
                  devuelvo el 100%; si no vienes sin avisar con al menos 24 horas, no hay
                  reembolso. Los detalles están en <Link href="/asesorias">Asesorías</Link>.
                </li>
                <li>
                  Las donaciones son voluntarias y no dan derecho a nada a cambio. Si haces una
                  por error, escríbeme y lo revisamos.
                </li>
                <li>Esto no limita los derechos que te reconoce la ley como consumidor.</li>
              </ul>
            </section>

            <section>
              <h2>9. Publicidad</h2>
              <p>
                La web puede mostrar anuncios de terceros (por ejemplo, Google AdSense). Los
                anuncios no son recomendaciones mías.
              </p>
            </section>

            <section>
              <h2>10. Disponibilidad y responsabilidad</h2>
              <p>
                Hago lo posible por que todo funcione, pero el servicio se ofrece tal cual: puede
                tener cortes, fallos o cambios, y puedo modificar o retirar funciones. No respondo
                de los daños que vengan de un uso indebido, de errores en los datos de terceros o
                de cortes ajenos a mí, salvo en lo que la ley no permita excluir.
              </p>
            </section>

            <section>
              <h2>11. Las tiendas de apps</h2>
              <p>
                Si usas las apps, también se aplican las condiciones de la tienda de la que las
                descargaste (App Store o Google Play). Apple y Google no son responsables del
                contenido ni del servicio de Soy Reinaldo.
              </p>
            </section>

            <section>
              <h2>12. Cambios en estos términos</h2>
              <p>
                Puedo actualizar estos términos. Si el cambio es importante, lo avisaré en la web
                o por correo. La fecha de arriba indica la última versión.
              </p>
            </section>

            <section>
              <h2>13. Ley aplicable</h2>
              <p>
                Estos términos se rigen por la ley española. Si eres consumidor, conservas los
                derechos y el fuero que te reconozca la ley de tu país de residencia.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
