import Link from "next/link";
import BotonCompartir from "@/components/BotonCompartir";
import { T } from "@/components/EnApp";

/** Página de un logro para compartir: la tarjeta, compartir y "juega tú". */
export default function TarjetaLogro({
  emoji,
  titulo,
  nombre,
  detalle,
  url,
  textoCompartir,
}: {
  emoji: string;
  titulo: string;
  nombre: string;
  detalle: string;
  url: string;
  textoCompartir: string;
}) {
  return (
    <main className="page">
      <section className="section">
        <div className="wrap logro">
          <div className="panel logro__tarjeta">
            <span className="logro__emoji" aria-hidden>{emoji}</span>
            <p className="mono logro__titulo">{titulo}</p>
            <h1 className="logro__nombre">{nombre}</h1>
            <p className="logro__detalle">{detalle}</p>
            <p className="mono logro__marca">soyreinaldo.com</p>
          </div>
          <div className="logro__acciones">
            <BotonCompartir url={url} texto={textoCompartir} etiqueta="Compartir mi logro" />
            <Link href="/quiniela-liga" className="btn btn--accent">
              <T>Juega la quiniela gratis</T> <span className="arr">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
