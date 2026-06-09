import Link from "next/link";

export const metadata = {
  title: "Cómo se puntúa | Quiniela Mundial 2026",
  description:
    "Reglas de puntuación de la quiniela del Mundial 2026: pronósticos, picks especiales y ajustes.",
};

export default function PuntosPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <p className="eyebrow">Mundial 2026</p>
          <h1 className="phero__title">
            Cómo se <span style={{ color: "var(--accent)" }}>puntúa</span>
            <span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Sumas puntos por acertar resultados, por tus picks especiales del
            torneo, y por los ajustes que pueda aplicar el admin de tu liga.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="space-y-8">
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
                Cada partido suma de forma independiente. No importa si
                pronosticas todos o solo algunos: solo cuentan los que tengas
                registrados antes del pitido inicial.
              </Note>
            </Section>

            <Section
              eyebrow="Una sola vez por torneo"
              title="Picks especiales"
              description="Eliges tus apuestas globales del Mundial al inicio del torneo. Se evalúan al final."
            >
              <Rule points={20} label="Campeón" example="Acertar el equipo que gana el Mundial" />
              <Rule points={5} label="Subcampeón" example="Acertar el equipo que pierde la final" />
              <Rule points={3} label="Tercer lugar" example="Acertar el equipo que queda tercero" />
              <Rule points={10} label="Equipo más goleador" example="La selección que más goles marca en todo el torneo" />
              <Rule points={10} label="Pichichi (nombre)" example="Acertar el máximo goleador del torneo" />
              <Rule points={5} label="Pichichi (goles exactos)" extra="extra" example="Si además aciertas cuántos goles marca: +5 sobre el bonus de nombre" />
              <Rule points={10} label="Balón de oro" example="El mejor jugador del Mundial" />
              <Rule points={7} label="Guante de oro" example="El mejor portero del torneo" />
              <Rule points={7} label="Jugador revelación" example="El jugador joven revelación del Mundial" />
              <Rule points={5} label="Máximo asistidor" example="El jugador con más asistencias" />
              <Rule points={8} label="Goleador en la final" example="Si el jugador que elegiste marca en la final" />
              <Note>
                Los nombres se comparan ignorando mayúsculas, acentos y espacios
                extra — no te preocupes si escribes &ldquo;Mbappe&rdquo; en vez
                de &ldquo;Mbappé&rdquo;.
              </Note>
            </Section>

            <Section
              eyebrow="Solo en tu liga"
              title="Ajustes del admin"
              description="Cada liga tiene un admin que puede sumar o restar puntos manualmente, con motivo."
            >
              <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1.6, margin: 0 }}>
                Sirve para resolver penalizaciones puntuales (apuestas paralelas
                entre amigos, jugadas que la liga acuerde premiar, etc.). No
                afecta a otras ligas en las que estés.
              </p>
            </Section>

            <Section
              eyebrow="Cuenta total"
              title="Tu puntuación final"
              description="En el ranking de cada liga ves los tres bloques sumados:"
            >
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8, color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1.6 }}>
                <li>
                  <span style={{ color: "var(--accent)" }}>· </span>
                  <strong style={{ color: "var(--text)" }}>Predicciones</strong> — todos los puntos por marcadores acertados a lo largo del torneo.
                </li>
                <li>
                  <span style={{ color: "var(--accent)" }}>· </span>
                  <strong style={{ color: "var(--text)" }}>Picks especiales</strong> — ganados al final del Mundial.
                </li>
                <li>
                  <span style={{ color: "var(--accent)" }}>· </span>
                  <strong style={{ color: "var(--text)" }}>Ajustes</strong> — bonus o penalizaciones del admin.
                </li>
              </ul>
              <Note>
                Los empates se desempatan por orden alfabético del nombre. Si te
                importa quedar bien colocado, ponte un nombre que empiece por A 😉
              </Note>
            </Section>
          </div>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/quiniela/partidos"
              className="btn btn--accent justify-center"
              style={{ flex: 1 }}
            >
              Ir a mis predicciones
            </Link>
            <Link
              href="/quiniela/picks"
              className="btn btn--ghost justify-center"
              style={{ flex: 1 }}
            >
              Editar mis picks especiales
            </Link>
          </div>
        </div>
      </section>
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
    <section className="acard">
      <p className="eyebrow" style={{ fontSize: "0.62rem" }}>
        {eyebrow}
      </p>
      <h2 style={{ marginTop: 12 }}>{title}</h2>
      <p className="sub" style={{ marginTop: 8 }}>
        {description}
      </p>
      <div className="space-y-3" style={{ marginTop: 18 }}>
        {children}
      </div>
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
      ? "var(--text-dim)"
      : points >= 10
        ? "var(--accent)"
        : "#4ade80";
  return (
    <div
      className="flex items-start gap-4"
      style={{
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        padding: "14px 16px",
      }}
    >
      <div className="flex shrink-0 flex-col items-center">
        <span
          className="display"
          style={{ fontSize: "1.6rem", color: tone, lineHeight: 1 }}
        >
          {points > 0 ? `+${points}` : points}
        </span>
        {extra && (
          <span className="mono" style={{ marginTop: 2, fontSize: "0.52rem", color: "var(--text-dim)" }}>
            {extra}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ margin: "4px 0 0", fontSize: "0.8rem", lineHeight: 1.5, color: "var(--text-dim)" }}>
          {example}
        </p>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="notice notice--info" style={{ fontSize: "0.8rem" }}>
      {children}
    </p>
  );
}
