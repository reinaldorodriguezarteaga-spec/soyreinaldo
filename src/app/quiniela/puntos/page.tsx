import Link from "next/link";

export const metadata = {
  title: "Cómo se puntúa | Quiniela Mundial 2026",
  description:
    "Reglas de puntuación de la quiniela del Mundial 2026: pronósticos, picks especiales y ajustes.",
};

export default function PuntosPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la quiniela
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Mundial 2026
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Cómo se <span className="text-indigo-300">puntúa</span>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Sumas puntos por acertar resultados, por tus picks especiales del
            torneo, y por los ajustes que pueda aplicar el admin de tu liga.
          </p>
        </header>

        <Section
          eyebrow="Por cada partido"
          title="Pronóstico del marcador"
          description="Para cada uno de los partidos del Mundial dejas tu marcador exacto antes del kickoff. Una vez empieza el partido no se puede editar."
        >
          <Rule
            points={3}
            label="Marcador exacto"
            example="Predijiste 2-1 y acabó 2-1"
          />
          <Rule
            points={1}
            label="Solo el ganador (o el empate)"
            example="Predijiste 2-1 y acabó 3-0 — acertaste que ganaba el local"
          />
          <Rule
            points={0}
            label="Fallo"
            example="Predijiste empate y ganó alguno"
          />
          <Note>
            Cada partido suma de forma independiente. No importa si pronosticas
            todos o solo algunos: solo cuentan los que tengas registrados antes
            del pitido inicial.
          </Note>
        </Section>

        <Section
          eyebrow="Una sola vez por torneo"
          title="Picks especiales"
          description="Eliges tus apuestas globales del Mundial al inicio del torneo. Se evalúan al final."
        >
          <Rule
            points={20}
            label="Campeón"
            example="Acertar el equipo que gana el Mundial"
          />
          <Rule
            points={5}
            label="Subcampeón"
            example="Acertar el equipo que pierde la final"
          />
          <Rule
            points={10}
            label="Equipo más goleador"
            example="Acertar la selección que más goles marca en todo el torneo"
          />
          <Rule
            points={10}
            label="Equipo menos goleado"
            example="Acertar la selección que menos goles encaja en todo el torneo"
          />
          <Rule
            points={10}
            label="Pichichi (nombre)"
            example="Acertar el máximo goleador del torneo"
          />
          <Rule
            points={5}
            label="Pichichi (goles exactos)"
            extra="extra"
            example="Si además aciertas cuántos goles marca: +5 sobre el bonus de nombre"
          />
          <Rule
            points={8}
            label="Goleador en la final"
            example="Si el jugador que elegiste marca en la final"
          />
          <Rule
            points={5}
            label="Total de hat-tricks"
            example="Acertar cuántos tripletes hay en todo el torneo"
          />
          <Note>
            Los nombres se comparan ignorando mayúsculas, acentos y espacios
            extra — no te preocupes si escribes &ldquo;Mbappe&rdquo; en vez de
            &ldquo;Mbappé&rdquo;.
          </Note>
        </Section>

        <Section
          eyebrow="Solo en tu liga"
          title="Ajustes del admin"
          description="Cada liga tiene un admin que puede sumar o restar puntos manualmente, con motivo."
        >
          <p className="text-sm leading-relaxed text-zinc-400">
            Sirve para resolver penalizaciones puntuales (apuestas paralelas
            entre amigos, jugadas que la liga acuerde premiar, etc.). No afecta
            a otras ligas en las que estés.
          </p>
        </Section>

        <Section
          eyebrow="Cuenta total"
          title="Tu puntuación final"
          description="En el ranking de cada liga ves los tres bloques sumados:"
        >
          <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-indigo-300">·</span>
              <span>
                <strong className="text-white">Predicciones</strong> — todos los
                puntos por marcadores acertados a lo largo del torneo.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-indigo-300">·</span>
              <span>
                <strong className="text-white">Picks especiales</strong> —
                ganados al final del Mundial.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-indigo-300">·</span>
              <span>
                <strong className="text-white">Ajustes</strong> — bonus o
                penalizaciones del admin.
              </span>
            </li>
          </ul>
          <Note>
            Los empates se desempatan por orden alfabético del nombre. Si te
            importa quedar bien colocado, ponte un nombre que empiece por A 😉
          </Note>
        </Section>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/quiniela/partidos"
            className="flex-1 rounded-xl bg-indigo-300 px-4 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
          >
            Ir a mis predicciones
          </Link>
          <Link
            href="/quiniela/picks"
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:text-white"
          >
            Editar mis picks especiales
          </Link>
        </div>
      </div>
    </main>
  );
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-indigo-300">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-xl font-semibold sm:text-2xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function Rule({
  points,
  label,
  extra,
  example,
}: {
  points: number;
  label: string;
  extra?: string;
  example: string;
}) {
  const tone =
    points === 0
      ? "text-zinc-500"
      : points >= 10
        ? "text-indigo-200"
        : "text-emerald-300";
  return (
    <div className="flex items-start gap-4 rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-3">
      <div className="flex shrink-0 flex-col items-center">
        <span
          className={`font-mono text-xl font-semibold tabular-nums ${tone}`}
        >
          {points > 0 ? `+${points}` : points}
        </span>
        {extra && (
          <span className="mt-0.5 text-[9px] uppercase tracking-widest text-zinc-500">
            {extra}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-100">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{example}</p>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-zinc-900 bg-zinc-900/40 px-4 py-3 text-xs leading-relaxed text-zinc-400">
      {children}
    </p>
  );
}
