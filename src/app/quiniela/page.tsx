import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CopyInviteIcon from "@/components/CopyInviteIcon";
import PrivateLeagueCard from "./private-league-card";
import { joinLeagueByCode, leaveLeague } from "./actions";

export const metadata = {
  title: "Quiniela Mundial 2026 | Soy Reinaldo",
  description:
    "Quiniela del Mundial FIFA 2026 con la comunidad de Fútbol con Reinaldo.",
};

type LeagueRow = {
  league: {
    id: string;
    name: string;
    code: string;
    description: string | null;
  };
};

type AvailableLeague = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_public: boolean;
  member_count: { count: number }[];
};

export default async function QuinielaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/quiniela");
  }

  // Cargar las ligas del usuario
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league:leagues(id, name, code, description)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .returns<LeagueRow[]>();

  const leagues = (memberships ?? []).map((m) => m.league).filter(Boolean);

  // Todas las ligas a las que aún no pertenece — incluye públicas y privadas
  const joinedIds = new Set(leagues.map((l) => l.id));
  const { data: allLeaguesData } = await supabase
    .from("leagues")
    .select(
      "id, name, code, description, is_public, member_count:league_members(count)",
    )
    .order("is_public", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<AvailableLeague[]>();
  const available = (allLeaguesData ?? []).filter(
    (l) => !joinedIds.has(l.id),
  );
  const availablePublic = available.filter((l) => l.is_public);
  const availablePrivate = available.filter((l) => !l.is_public);

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "amigo";

  const isAdmin = await isAdminUser(supabase, user.id);

  // ¿Le falta username o teléfono al perfil? Para mostrar banner.
  const { data: profileExtras } = await supabase
    .from("profiles")
    .select("username, phone_number")
    .eq("id", user.id)
    .maybeSingle();
  const missingUsername = !profileExtras?.username;
  const missingPhone = !profileExtras?.phone_number;

  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Mundial 2026 · 11 jun – 19 jul</p>
          <h1 className="phero__title">
            Hola, <span style={{ color: "var(--accent)" }}>{displayName}</span>
            <span className="dot">.</span>
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 720 }}>
          {(missingUsername || missingPhone) && (
            <ProfileBanner
              missingUsername={missingUsername}
              missingPhone={missingPhone}
            />
          )}

          {leagues.length === 0 ? (
            <NoLeaguesState
              publicLeagues={availablePublic}
              privateLeagues={availablePrivate}
            />
          ) : (
            <LeaguesList
              leagues={leagues}
              canAddMore
              isAdmin={isAdmin}
              publicLeagues={availablePublic}
              privateLeagues={availablePrivate}
            />
          )}

          {isAdmin && (
            <div className="notice notice--ok" style={{ marginTop: 32 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>🛠 Eres admin</p>
              <p style={{ margin: "4px 0 0", color: "var(--text-dim)" }}>
                Gestiona las ligas y sus códigos en{" "}
                <Link href="/admin/ligas" style={{ color: "var(--accent)" }}>
                  /admin/ligas
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ProfileBanner({
  missingUsername,
  missingPhone,
}: {
  missingUsername: boolean;
  missingPhone: boolean;
}) {
  let title = "";
  let body = "";
  if (missingUsername && missingPhone) {
    title = "Completa tu perfil";
    body =
      "Elige un usuario para entrar más rápido y deja tu teléfono para recibir recordatorios cuando se acerque un partido.";
  } else if (missingUsername) {
    title = "Elige un usuario";
    body =
      "Te servirá para entrar a la web sin tener que escribir tu email completo.";
  } else {
    title = "Añade tu teléfono";
    body =
      "Para recibir recordatorios cuando se acerque un partido y no se te pase predecir.";
  }

  return (
    <Link href="/completar-perfil" className="banner" style={{ marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        <p className="banner__tag">{title}</p>
        <p className="banner__p">{body}</p>
      </div>
      <span className="banner__arr">→</span>
    </Link>
  );
}

function NoLeaguesState({
  publicLeagues,
  privateLeagues,
}: {
  publicLeagues: AvailableLeague[];
  privateLeagues: AvailableLeague[];
}) {
  return (
    <div className="space-y-8">
      {publicLeagues.length > 0 && (
        <section>
          <div className="shead">
            <h2>Únete con un click</h2>
          </div>
          <div className="space-y-3">
            {publicLeagues.map((l) => (
              <PublicLeagueCard key={l.id} league={l} />
            ))}
          </div>
        </section>
      )}

      {privateLeagues.length > 0 && (
        <section>
          <div className="shead">
            <h2>Ligas privadas</h2>
            <span className="sh-note">Requieren código</span>
          </div>
          <div className="space-y-3">
            {privateLeagues.map((l) => (
              <PrivateLeagueCard
                key={l.id}
                league={{
                  id: l.id,
                  name: l.name,
                  description: l.description,
                  memberCount: l.member_count?.[0]?.count ?? 0,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <div className="panel" style={{ padding: 24 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>Reglas del juego</p>
        <ul
          style={{
            margin: "14px 0 0",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 8,
            color: "var(--text-dim)",
            fontSize: "0.9rem",
          }}
        >
          <li>· Resultado exacto del partido — 3 puntos</li>
          <li>· Solo ganador / empate — 1 punto</li>
          <li>· Acertar el campeón del Mundial — 20 puntos</li>
          <li>· Acertar el subcampeón — 5 puntos</li>
          <li>· Acertar el Pichichi — 10 puntos</li>
          <li>· + goles exactos del Pichichi — 5 puntos extra</li>
          <li>· Acertar un goleador de la final — 8 puntos</li>
        </ul>
        <Link
          href="/quiniela/puntos"
          className="mono"
          style={{ display: "inline-block", marginTop: 16, color: "var(--accent)" }}
        >
          Ver reglas completas →
        </Link>
      </div>
    </div>
  );
}

function PublicLeagueCard({ league }: { league: AvailableLeague }) {
  const count = league.member_count?.[0]?.count ?? 0;
  return (
    <article className="leaguerow leaguerow--accent">
      <div className="leaguerow__main">
        <h3 className="leaguerow__name">
          {league.name}
          <span className="badge badge--ok">Pública</span>
        </h3>
        {league.description && (
          <p className="leaguerow__desc">{league.description}</p>
        )}
        <p className="leaguerow__meta">
          {count} {count === 1 ? "miembro" : "miembros"} ya dentro
        </p>
      </div>
      <form action={joinLeagueByCode} className="leaguerow__actions">
        <input type="hidden" name="code" value={league.code} />
        <button type="submit" className="btn btn--accent">
          Unirme
        </button>
      </form>
    </article>
  );
}

function LeaguesList({
  leagues,
  isAdmin,
  publicLeagues = [],
  privateLeagues = [],
}: {
  leagues: { id: string; name: string; code: string; description: string | null }[];
  canAddMore?: boolean;
  isAdmin?: boolean;
  publicLeagues?: AvailableLeague[];
  privateLeagues?: AvailableLeague[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <div className="shead">
          <h2>Tus ligas</h2>
          <span className="sh-note">{leagues.length} en total</span>
        </div>
        <div className="space-y-3">
          {leagues.map((l) => (
            <article key={l.id} className="leaguerow">
              <div className="leaguerow__main">
                <h3 className="leaguerow__name">
                  {l.name}
                  <span className="codepill">{l.code}</span>
                  {isAdmin && <CopyInviteIcon code={l.code} />}
                </h3>
                {l.description && (
                  <p className="leaguerow__desc">{l.description}</p>
                )}
              </div>
              <div className="leaguerow__actions">
                <Link
                  href={`/quiniela/ranking/${l.id}`}
                  className="btn btn--ghost"
                  style={{ padding: "10px 16px", fontSize: "0.68rem" }}
                >
                  Ver ranking <span className="arr">→</span>
                </Link>
                <form action={leaveLeague}>
                  <input type="hidden" name="league_id" value={l.id} />
                  <button
                    type="submit"
                    className="mono"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "var(--text-dim)",
                      cursor: "pointer",
                    }}
                    title="Salir de esta liga"
                  >
                    Salir
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      {publicLeagues.length > 0 && (
        <section>
          <div className="shead">
            <h2>Únete a otra liga pública</h2>
          </div>
          <div className="space-y-3">
            {publicLeagues.map((l) => (
              <PublicLeagueCard key={l.id} league={l} />
            ))}
          </div>
        </section>
      )}

      {privateLeagues.length > 0 && (
        <section>
          <div className="shead">
            <h2>Ligas privadas</h2>
            <span className="sh-note">Requieren código</span>
          </div>
          <div className="space-y-3">
            {privateLeagues.map((l) => (
              <PrivateLeagueCard
                key={l.id}
                league={{
                  id: l.id,
                  name: l.name,
                  description: l.description,
                  memberCount: l.member_count?.[0]?.count ?? 0,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid2">
        <Link href="/quiniela/partidos" className="linkcard linkcard--accent">
          <div style={{ minWidth: 0 }}>
            <p className="linkcard__tag">Pronósticos</p>
            <p className="linkcard__h">Los 104 partidos</p>
            <p className="linkcard__p">Por fase, con auto-guardado</p>
          </div>
          <span className="linkcard__arr">→</span>
        </Link>

        <Link href="/quiniela/picks" className="linkcard linkcard--accent">
          <div style={{ minWidth: 0 }}>
            <p className="linkcard__tag">Picks de torneo</p>
            <p className="linkcard__h">Campeón · Pichichi</p>
            <p className="linkcard__p">Subcampeón · Goleador en la final</p>
          </div>
          <span className="linkcard__arr">→</span>
        </Link>
      </div>

      <Link href="/quiniela/puntos" className="linkcard">
        <div style={{ minWidth: 0 }}>
          <p className="linkcard__tag">📖 Reglas</p>
          <p className="linkcard__p" style={{ marginTop: 4 }}>
            Cómo se puntúa cada acierto
          </p>
        </div>
        <span className="linkcard__arr">→</span>
      </Link>

    </div>
  );
}

async function isAdminUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  return data?.is_admin === true;
}
