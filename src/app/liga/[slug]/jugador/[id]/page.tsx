import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getPlayerExtras,
  getPlayerSeasonStats,
  type PlayerExtras as PlayerExtrasData,
  type PlayerSeason,
} from "@/lib/sports/api-football";
import { COMPETITIONS_BY_SLUG, type Competition } from "@/lib/sports/competitions";
import PlayerExtras from "@/components/PlayerExtras";
import FavoriteStar from "@/components/FavoriteStar";
import { isFavorited } from "@/app/actions/favorites";

const POS_ES: Record<string, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfielder: "Centrocampista",
  Attacker: "Delantero",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { slug, id } = await params;
  const competition = COMPETITIONS_BY_SLUG[slug];
  if (!competition) return {};
  const p = await getPlayerSeasonStats(Number(id), competition).catch(() => null);
  if (!p) return { title: `Jugador · ${competition.name} | Soy Reinaldo` };
  const title = `${p.name} · ${competition.name}`;
  const description = `${p.goals} goles y ${p.assists} asistencias de ${p.name} en ${competition.name}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LigaJugadorPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const competition: Competition | undefined = COMPETITIONS_BY_SLUG[slug];
  if (!competition) notFound();

  const pid = Number(id);
  if (!Number.isFinite(pid)) notFound();

  const [p, extras, favorited] = await Promise.all([
    getPlayerSeasonStats(pid, competition).catch(() => null),
    getPlayerExtras(pid).catch(
      () => ({ trophies: [], transfers: [], sidelined: [] }) as PlayerExtrasData,
    ),
    isFavorited("player", id),
  ]);

  if (!p && extras.trophies.length === 0) notFound();

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 16 }}>
        <div className="wrap">
          <Link
            href={`/liga/${competition.slug}/buscar`}
            className="eyebrow"
            style={{ display: "inline-block", color: "var(--accent)" }}
          >
            ← Buscar
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14 }}>
            {p?.photo && (
              <Image
                src={p.photo}
                alt=""
                width={72}
                height={72}
                unoptimized
                style={{ borderRadius: "50%", background: "var(--surface-2)" }}
              />
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h1 className="phero__title" style={{ fontSize: "clamp(1.8rem,5vw,3rem)", margin: 0 }}>
                  {p?.name ?? "Jugador"}
                </h1>
                <FavoriteStar
                  target={{
                    kind: "player",
                    id: pid,
                    name: p?.name ?? "Jugador",
                    competitionSlug: competition.slug,
                  }}
                  initialFavorited={favorited}
                />
              </div>
              <p className="phero__lede" style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {p?.team && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Image src={p.team.logo} alt="" width={20} height={20} unoptimized />
                    {p.team.name}
                  </span>
                )}
                {p?.position && <span>· {POS_ES[p.position] ?? p.position}</span>}
                {p?.age != null && <span>· {p.age} años</span>}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 680 }}>
          {p && <SeasonStats p={p} />}
          <PlayerExtras extras={extras} />
        </div>
      </section>
    </main>
  );
}

function SeasonStats({ p }: { p: PlayerSeason }) {
  const lines: { label: string; value: string | number | null }[] = [
    { label: "Partidos jugados", value: p.appearances },
    { label: "Titularidades", value: p.lineups },
    { label: "Minutos", value: p.minutes != null ? `${p.minutes}'` : null },
    { label: "Goles", value: p.goals },
    { label: "Asistencias", value: p.assists },
    {
      label: "Tiros",
      value:
        p.shotsTotal != null
          ? p.shotsOn != null
            ? `${p.shotsTotal} (${p.shotsOn} a puerta)`
            : p.shotsTotal
          : null,
    },
    {
      label: "Pases",
      value:
        p.passesTotal != null
          ? p.passesAcc != null
            ? `${p.passesTotal} · ${p.passesAcc}%`
            : p.passesTotal
          : null,
    },
    { label: "Pases clave", value: p.passesKey },
    {
      label: "Regates",
      value:
        p.dribblesAttempts != null
          ? `${p.dribblesSuccess ?? 0}/${p.dribblesAttempts}`
          : null,
    },
    {
      label: "Duelos ganados",
      value: p.duelsTotal != null ? `${p.duelsWon ?? 0}/${p.duelsTotal}` : null,
    },
    { label: "Amarillas", value: p.yellow > 0 ? p.yellow : null },
    { label: "Rojas", value: p.red > 0 ? p.red : null },
  ].filter((l) => l.value != null && l.value !== "");

  return (
    <div className="panel" style={{ overflow: "hidden", marginBottom: 24 }}>
      <div className="shead" style={{ padding: "12px 16px 0" }}>
        <h2 style={{ fontSize: "1.05rem" }}>Totales de la temporada</h2>
        {p.rating != null && (
          <span
            className="tabular-nums"
            style={{
              background: "#4ade80",
              color: "#0a1030",
              borderRadius: 8,
              padding: "2px 8px",
              fontWeight: 800,
            }}
          >
            {p.rating.toFixed(2)}
          </span>
        )}
      </div>
      <div style={{ padding: "8px 0 0" }}>
        {lines.map((l, i) => (
          <div
            key={l.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 16px",
              borderTop: i > 0 ? "1px solid var(--line)" : undefined,
              fontSize: "0.9rem",
            }}
          >
            <span style={{ color: "var(--text-dim)" }}>{l.label}</span>
            <b className="tabular-nums">{l.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
