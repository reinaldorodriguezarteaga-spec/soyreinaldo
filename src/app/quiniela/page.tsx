import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinLeagueForm from "./join-league-form";
import { leaveLeague } from "./actions";

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
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Mundial 2026 · 11 jun – 19 jul
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Hola, <span className="text-indigo-300">{displayName}</span>.
          </h1>
        </header>

        {(missingUsername || missingPhone) && (
          <ProfileBanner
            missingUsername={missingUsername}
            missingPhone={missingPhone}
          />
        )}

        {leagues.length === 0 ? (
          <NoLeaguesState />
        ) : (
          <LeaguesList leagues={leagues} canAddMore />
        )}

        {isAdmin && (
          <div className="mt-10 rounded-xl border border-indigo-400/30 bg-indigo-500/5 p-5 text-sm">
            <p className="text-indigo-300">🛠 Eres admin</p>
            <p className="mt-1 text-zinc-400">
              Gestiona las ligas y sus códigos en{" "}
              <Link
                href="/admin/ligas"
                className="font-medium text-indigo-300 hover:text-indigo-200"
              >
                /admin/ligas
              </Link>
              .
            </p>
          </div>
        )}
      </div>
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
    <Link
      href="/completar-perfil"
      className="group mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-zinc-950 to-zinc-950 p-5 transition hover:border-amber-300/50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300">
          {title}
        </p>
        <p className="mt-1 text-sm text-zinc-300">{body}</p>
      </div>
      <span className="shrink-0 text-xl text-amber-300 transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

function NoLeaguesState() {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-zinc-950 to-zinc-950 p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Introduce tu código de acceso</h2>
        <p className="mt-2 text-sm text-zinc-400">
          La quiniela está dividida en grupos privados (familiar, amigos,
          comunidad...). Pídeme el código del grupo al que perteneces y
          pégalo aquí.
        </p>
        <div className="mt-6">
          <JoinLeagueForm />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-400">
        <p className="font-medium text-white">Reglas del juego</p>
        <ul className="mt-3 space-y-1.5">
          <li>· Resultado exacto del partido — 3 puntos</li>
          <li>· Solo ganador / empate — 1 punto</li>
          <li>· Acertar el campeón del Mundial — 20 puntos</li>
          <li>· Acertar el subcampeón — 5 puntos</li>
          <li>· Acertar el Pichichi — 10 puntos</li>
          <li>· + goles exactos del Pichichi — 5 puntos extra</li>
          <li>· Acertar un goleador de la final — 8 puntos</li>
          <li>· Acertar el total de hat-tricks del torneo — 5 puntos</li>
        </ul>
      </div>
    </div>
  );
}

function LeaguesList({
  leagues,
  canAddMore,
}: {
  leagues: { id: string; name: string; code: string; description: string | null }[];
  canAddMore?: boolean;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
          Tus ligas ({leagues.length})
        </h2>
        <div className="space-y-3">
          {leagues.map((l) => (
            <article
              key={l.id}
              className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold">{l.name}</h3>
                  <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-indigo-300">
                    {l.code}
                  </span>
                </div>
                {l.description && (
                  <p className="mt-1 text-sm text-zinc-400">{l.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/quiniela/ranking/${l.id}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-indigo-300 hover:text-white"
                >
                  Ver ranking →
                </Link>
                <form action={leaveLeague}>
                  <input type="hidden" name="league_id" value={l.id} />
                  <button
                    type="submit"
                    className="text-xs text-zinc-500 transition hover:text-red-300"
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

      {canAddMore && (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <summary className="cursor-pointer text-sm font-medium text-zinc-300 hover:text-white">
            Unirme a otra liga con un código
          </summary>
          <div className="mt-5">
            <JoinLeagueForm />
          </div>
        </details>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/quiniela/partidos"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-zinc-950 to-zinc-950 p-6 transition hover:border-indigo-300"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">
              Pronósticos
            </p>
            <p className="mt-1.5 text-base font-semibold sm:text-lg">
              Los 104 partidos
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Por fase, con auto-guardado
            </p>
          </div>
          <span className="shrink-0 text-2xl text-indigo-300 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>

        <Link
          href="/quiniela/picks"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-zinc-950 to-zinc-950 p-6 transition hover:border-indigo-300"
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">
              Picks de torneo
            </p>
            <p className="mt-1.5 text-base font-semibold sm:text-lg">
              Campeón · Pichichi
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Goleador en la final · Hat-tricks
            </p>
          </div>
          <span className="shrink-0 text-2xl text-indigo-300 transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-sm text-zinc-400">
        <p className="text-xs uppercase tracking-widest text-indigo-300">
          Próximamente
        </p>
        <p className="mt-2">
          Ranking en vivo durante el torneo. En cuanto cargue el primer
          partido, los puntos empiezan a contar.
        </p>
      </div>
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
