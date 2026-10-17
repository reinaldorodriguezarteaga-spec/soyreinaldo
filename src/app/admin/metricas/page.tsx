import Link from "next/link";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

export const metadata = { title: "Métricas | Admin | Soy Reinaldo" };
export const dynamic = "force-dynamic";

/**
 * Panel de métricas del dueño (17-oct): cuentas, actividad app/web,
 * jugadores por jornada, duelos, encuestas, favoritos y avisos. Una sola
 * llamada a `admin_metricas()` (migración 074) con la service role; el
 * layout de /admin ya ha comprobado que quien mira es admin.
 */

type Punto = { etiqueta: string; n: number };
type Metricas = {
  cuentas: number;
  confirmadas: number;
  altas: { dia: string; n: number }[];
  activos: { dia: string; app: number; web: number }[];
  activos_7d: { app: number; web: number };
  jugadores_jornada: { jornada: number; n: number }[];
  duelos: { total: number; aceptados: number; pendientes: number; rechazados: number };
  encuestas: { total: number; votos: number; votantes: number };
  favoritos: { con_favoritos: number; con_mi_equipo: number; eligieron: number };
  avisos: { web_push: number; iphone: number; aceptan_correos: number };
  boletin: { edicion: string; n: number }[];
};

const corto = (dia: string) =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(dia));

export default async function AdminMetricasPage() {
  const db = clienteServicio();
  const { data } = db ? await db.rpc("admin_metricas") : { data: null };
  const m = data as Metricas | null;
  if (!m) {
    return <main className="page"><div className="wrap" style={{ padding: 40 }}>No se pudieron cargar las métricas.</div></main>;
  }
  const ultimaJornada = m.jugadores_jornada.at(-1);

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/admin/ligas" className="text-sm text-zinc-500 transition hover:text-white">
          ← Admin
        </Link>
        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">Admin · Métricas</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Cómo va la web</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Las visitas sin cuenta están en Vercel Analytics; aquí, lo de los usuarios registrados.
            La actividad app/web se cuenta desde el 17 de octubre de 2026.
          </p>
        </header>

        <div className="met-tiles">
          <Tile valor={m.cuentas} etiqueta="Cuentas" nota={`${m.confirmadas} confirmadas`} />
          <Tile valor={m.activos_7d.app} etiqueta="Usan la app" nota="últimos 7 días" />
          <Tile valor={m.activos_7d.web} etiqueta="Usan la web" nota="con sesión, 7 días" />
          <Tile
            valor={ultimaJornada?.n ?? 0}
            etiqueta="Juegan la jornada"
            nota={ultimaJornada ? `jornada ${ultimaJornada.jornada}` : "—"}
          />
        </div>

        <Barras
          titulo="Altas por día (30 días)"
          puntos={m.altas.map((a) => ({ etiqueta: corto(a.dia), n: a.n }))}
          unidad="altas"
        />
        <Barras
          titulo="Jugadores por jornada"
          puntos={m.jugadores_jornada.map((j) => ({ etiqueta: `J${j.jornada}`, n: j.n }))}
          unidad="jugadores"
        />
        <Barras
          titulo="Usuarios en la app por día"
          puntos={m.activos.map((a) => ({ etiqueta: corto(a.dia), n: a.app }))}
          unidad="en la app"
        />
        <Barras
          titulo="Usuarios con sesión en la web por día"
          puntos={m.activos.map((a) => ({ etiqueta: corto(a.dia), n: a.web }))}
          unidad="en la web"
        />

        <div className="met-grupos">
          <Grupo titulo="⚔️ Duelos" filas={[
            ["Lanzados", m.duelos.total],
            ["Aceptados", m.duelos.aceptados],
            ["Pendientes", m.duelos.pendientes],
            ["Rechazados", m.duelos.rechazados],
          ]} />
          <Grupo titulo="🗳️ Encuestas" filas={[
            ["Encuestas", m.encuestas.total],
            ["Votos", m.encuestas.votos],
            ["Personas que votan", m.encuestas.votantes],
          ]} />
          <Grupo titulo="⭐ Favoritos" filas={[
            ["Pasaron por el selector", m.favoritos.eligieron],
            ["Con algún favorito", m.favoritos.con_favoritos],
            ["Con «Mi equipo»", m.favoritos.con_mi_equipo],
          ]} />
          <Grupo titulo="🔔 Avisos" filas={[
            ["Aceptan correos", m.avisos.aceptan_correos],
            ["Push en navegador", m.avisos.web_push],
            ["Push en iPhone", m.avisos.iphone],
            ...m.boletin.map((b) => [`Boletín ${b.edicion}`, b.n] as [string, number]),
          ]} />
        </div>
      </div>
    </main>
  );
}

function Tile({ valor, etiqueta, nota }: { valor: number; etiqueta: string; nota: string }) {
  return (
    <div className="panel met-tile">
      <span className="met-tile__valor">{valor.toLocaleString("es-ES")}</span>
      <span className="met-tile__etiqueta">{etiqueta}</span>
      <span className="mono met-tile__nota">{nota}</span>
    </div>
  );
}

/** Barras de una sola serie, con el dato al pasar el ratón y la tabla debajo. */
function Barras({ titulo, puntos, unidad }: { titulo: string; puntos: Punto[]; unidad: string }) {
  const max = Math.max(1, ...puntos.map((p) => p.n));
  return (
    <section className="panel met-chart">
      <h2>{titulo}</h2>
      {puntos.length === 0 ? (
        <p className="met-vacio">Aún sin datos.</p>
      ) : (
        <>
          <div className="met-barras" role="img" aria-label={`${titulo}: ${puntos.map((p) => `${p.etiqueta} ${p.n}`).join(", ")}`}>
            {puntos.map((p) => (
              <div key={p.etiqueta} className="met-barra" title={`${p.etiqueta}: ${p.n} ${unidad}`}>
                <span className="met-barra__fill" style={{ height: `${(p.n / max) * 100}%` }} />
                <span className="met-barra__tip mono">{p.n}</span>
              </div>
            ))}
          </div>
          <div className="met-ejes mono">
            <span>{puntos[0].etiqueta}</span>
            <span>máx. {max}</span>
            <span>{puntos.at(-1)!.etiqueta}</span>
          </div>
          <details className="met-tabla">
            <summary className="mono">Ver tabla</summary>
            <table>
              <tbody>
                {puntos.map((p) => (
                  <tr key={p.etiqueta}><td>{p.etiqueta}</td><td>{p.n}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}

function Grupo({ titulo, filas }: { titulo: string; filas: [string, number][] }) {
  return (
    <section className="panel met-grupo">
      <h2>{titulo}</h2>
      <dl>
        {filas.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v.toLocaleString("es-ES")}</dd></div>
        ))}
      </dl>
    </section>
  );
}
