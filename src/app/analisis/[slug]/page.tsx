import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { porSlug } from "@/lib/analisis/queries";
import { markdownAHtml, minutosDeLectura } from "@/lib/analisis/markdown";
import JsonLd, { absolute } from "@/lib/seo/json-ld";
import ShareArticle from "@/components/ShareArticle";
import ViewPing from "@/components/ViewPing";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const a = await porSlug(slug);
  if (!a) return { title: "Análisis | Soy Reinaldo" };
  return {
    title: `${a.title} | Soy Reinaldo`,
    description: a.excerpt ?? undefined,
    alternates: { canonical: `/analisis/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.excerpt ?? undefined,
      type: "article",
      publishedTime: a.published_at ?? undefined,
      images: a.cover_url ? [a.cover_url] : undefined,
    },
    twitter: { card: "summary_large_image", title: a.title },
  };
}

export default async function AnalisisPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await porSlug(slug);
  // La RLS solo deja leer los publicados: un borrador sale como inexistente.
  if (!a) notFound();

  const html = markdownAHtml(a.body);
  const fecha = a.published_at
    ? new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(
        new Date(a.published_at),
      )
    : null;

  return (
    <main className="page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          ...(a.excerpt ? { description: a.excerpt } : {}),
          ...(a.cover_url ? { image: a.cover_url } : {}),
          datePublished: a.published_at,
          dateModified: a.updated_at,
          author: { "@type": "Person", name: "Reinaldo Rodríguez" },
          publisher: { "@type": "Person", name: "Soy Reinaldo" },
          mainEntityOfPage: absolute(`/analisis/${a.slug}`),
        }}
      />

      <section className="phero" style={{ paddingBottom: 16 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <Link
            href="/analisis"
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Análisis
          </Link>
          <h1
            className="phero__title"
            style={{ fontSize: "clamp(2rem,5vw,3.2rem)", marginTop: 12, textWrap: "balance" }}
          >
            {a.title}
          </h1>
          <p className="mono" style={{ color: "var(--text-dim)", fontSize: "0.7rem", letterSpacing: "0.12em", marginTop: 10 }}>
            {fecha ? fecha.toUpperCase() : ""} · {minutosDeLectura(a.body)} MIN DE LECTURA
            {a.view_count >= 20 ? ` · ${a.view_count} LECTURAS` : ""}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 8 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          {a.cover_url && (
            <Image
              src={a.cover_url}
              alt=""
              width={1200}
              height={630}
              unoptimized
              style={{ width: "100%", height: "auto", borderRadius: "var(--radius)", marginBottom: 24 }}
            />
          )}

          <article
            className="prosa"
            dangerouslySetInnerHTML={{ __html: html }}
          />

          {a.fixture_id && a.competition_slug && (
            <p style={{ marginTop: 32 }}>
              <Link
                href={`/liga/${a.competition_slug}/partido/${a.fixture_id}`}
                className="btn btn--accent"
              >
                Ver el partido <span className="arr">→</span>
              </Link>
            </p>
          )}

          <ShareArticle
            title={a.title}
            url={absolute(`/analisis/${a.slug}`)}
            slug={a.slug}
            shareCount={a.share_count}
          />

          {/* Cuenta la lectura desde el navegador y con retardo: así no
              cuentan los rastreadores, que aquí son legión. */}
          <ViewPing slug={a.slug} />
        </div>
      </section>
    </main>
  );
}
