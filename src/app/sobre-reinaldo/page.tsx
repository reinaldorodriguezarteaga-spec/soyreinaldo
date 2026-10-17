import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import { getSocialStats } from "@/lib/social-stats";
import { AUTOR } from "@/lib/autor/autor";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sobre Reinaldo Rodríguez (@SoyReinaldoR) | Soy Reinaldo",
  description:
    "Quién es Reinaldo Rodríguez, creador de contenido de fútbol (@SoyReinaldoR): sus redes, sus análisis y qué encontrarás en soyreinaldo.com.",
  alternates: { canonical: "/sobre-reinaldo" },
};

/**
 * "Sobre Reinaldo" (17-oct): quién escribe la web. Google (y AdSense) valoran
 * saber quién firma el contenido y por qué es fiable.
 */
export default async function SobreReinaldoPage() {
  const stats = await getSocialStats();
  const supabase = await createClient();
  const { count: analisis } = await supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("published_at", "is", null);

  return (
    <main className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: AUTOR.nombre,
            alternateName: AUTOR.usuario,
            url: absolute(AUTOR.url),
            image: absolute(AUTOR.foto),
            description: AUTOR.lema,
            sameAs: AUTOR.redes.map((r) => r.url),
          },
        }}
      />
      <section className="phero" style={{ paddingBottom: 12 }}>
        <div className="wrap sobre">
          <Image src="/branding/retrato.png" alt="Reinaldo Rodríguez" width={220} height={292} className="sobre__foto" priority />
          <div>
            <p className="eyebrow">Quién está detrás</p>
            <h1 className="phero__title" style={{ fontSize: "clamp(2.2rem,6vw,3.6rem)" }}>
              {AUTOR.nombre}
            </h1>
            <p className="phero__lede">{AUTOR.lema}</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap prosa" style={{ maxWidth: 760 }}>
          <p>
            Soy Reinaldo, {AUTOR.usuario} en redes. Hago contenido de fútbol cada día: opinión sin filtro,
            análisis de los partidos y la actualidad del Barça y de LaLiga, con una comunidad de más de{" "}
            <strong>{stats.total_followers.replace(/^\+/, "")} seguidores</strong> entre Instagram, TikTok, Facebook, YouTube y Threads.
          </p>
          <p>
            soyreinaldo.com es la casa de esa comunidad: marcadores en directo de las grandes ligas, mis{" "}
            <Link href="/analisis">análisis</Link> ({analisis ?? 0} publicados), la previa y la crónica de
            cada partido, la liga de pronósticos para jugar con tus amigos y mis vídeos de cada jornada.
          </p>
          <h2>Dónde encontrarme</h2>
          <ul>
            {AUTOR.redes.map((r) => (
              <li key={r.nombre}>
                <a href={r.url} target="_blank" rel="noopener noreferrer me">
                  {r.nombre}
                </a>
              </li>
            ))}
          </ul>
          <p>
            ¿Colaboraciones o prensa? Escríbeme desde <Link href="/contacto">contacto</Link> o mira el{" "}
            <Link href="/media-kit">media kit</Link>.
          </p>
          <p className="sobre__nota">
            soyreinaldo.com no está afiliada a ninguna liga, competición ni club. Los datos deportivos son de
            API-Football; la opinión, mía.
          </p>
        </div>
      </section>
    </main>
  );
}
