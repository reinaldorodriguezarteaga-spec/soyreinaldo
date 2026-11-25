import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import VideoLite from "@/components/VideoLite";
import { getUltimosVideos } from "@/lib/youtube/videos";
import { listarPublicados } from "@/lib/analisis/queries";

/**
 * «Lo último de Reinaldo» en lo alto de la portada (25-nov-2026, pedido del
 * dueño). Lo que no tiene ninguna otra web de resultados: su opinión. Último
 * vídeo largo del canal, sus últimos shorts y la entradilla de su último
 * análisis. Todo automático (feed RSS de YouTube y la tabla de análisis):
 * no hay que subir nada a mano.
 */
export default async function HomeReinaldo() {
  const [videos, analisis] = await Promise.all([
    getUltimosVideos().catch(() => []),
    listarPublicados(1).catch(() => []),
  ]);
  // Si YouTube no dijo el formato, cuenta como vídeo largo: se ve bien en 16:9.
  const largo = videos.find((v) => v.short !== true) ?? null;
  const shorts = videos.filter((v) => v.short === true).slice(0, 3);
  const ultimo = analisis[0] ?? null;
  if (!largo && shorts.length === 0 && !ultimo) return null;

  return (
    <section className="panel reinaldo" aria-labelledby="reinaldo-titulo">
      <header className="reinaldo__cab">
        <Image src="/branding/avatar.jpg" alt="" width={44} height={44} className="reinaldo__avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="mono reinaldo__eyebrow">@SoyReinaldoR</p>
          <h2 id="reinaldo-titulo" className="reinaldo__titulo">Lo último de Reinaldo</h2>
        </div>
        <a
          href="https://www.youtube.com/@SoyReinaldoR?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="mono reinaldo__canal"
        >
          SUSCRIBIRME →
        </a>
      </header>

      {largo && <VideoLite id={largo.id} titulo={largo.titulo} />}

      {shorts.length > 0 && (
        <div className="reinaldo__shorts">
          {shorts.map((s) => (
            <a
              key={s.id}
              href={`https://www.youtube.com/shorts/${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="reinaldo__short"
              title={s.titulo}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${s.id}/oar2.jpg`} alt="" loading="lazy" />
              <span className="reinaldo__shortplay" aria-hidden>
                <Play className="ico-txt" aria-hidden />
              </span>
              <span className="reinaldo__shorttitulo">{s.titulo}</span>
            </a>
          ))}
        </div>
      )}

      {ultimo && (
        <Link href={`/analisis/${ultimo.slug}`} className="reinaldo__cita">
          <span className="mono reinaldo__eyebrow">Mi análisis</span>
          <span className="reinaldo__citatitulo">{ultimo.title}</span>
          {ultimo.excerpt && <span className="reinaldo__citatexto">«{ultimo.excerpt}»</span>}
          <span className="mono reinaldo__leer">LEER →</span>
        </Link>
      )}
    </section>
  );
}
