import Image from "next/image";
import Link from "next/link";
import { AUTOR } from "@/lib/autor/autor";

/** Firma de los análisis: quién escribe, con enlace a "Sobre Reinaldo". */
export default function FirmaAutor() {
  return (
    <Link href={AUTOR.url} className="firma">
      <Image src={AUTOR.foto} alt="" width={44} height={44} className="firma__foto" />
      <span>
        <span className="firma__nombre">
          Por {AUTOR.nombre} <span className="firma__usuario">{AUTOR.usuario}</span>
        </span>
        <span className="firma__lema">{AUTOR.lema}</span>
      </span>
    </Link>
  );
}
