import type { Metadata } from "next";
import { getLiveNow } from "@/lib/sports/live-now";
import LiveList from "./live-list";

/** Se regenera cada 30 s; el auto-refresco del cliente hace el resto. */
export const revalidate = 30;

export const metadata: Metadata = {
  title: "En vivo | Soy Reinaldo",
  description:
    "Todos los partidos que se están jugando ahora mismo: LaLiga, Premier, Serie A, Ligue 1, Champions y más, con marcador minuto a minuto.",
  alternates: { canonical: "/en-vivo" },
};

/**
 * Página de directos: todo lo que se juega AHORA, de todas las
 * competiciones. Es el destino del badge "EN VIVO" del header, que está en
 * todas las páginas — antes llevaba a la portada, donde había que buscar el
 * marcador a mano (pedido del dueño).
 */
export default async function EnVivoPage() {
  const grupos = await getLiveNow();
  const total = grupos.reduce((n, g) => n + g.fixtures.length, 0);

  return (
    <main className="page">
      <section className="phero" style={{ paddingBottom: 12 }}>
        <div className="wrap">
          <p className="eyebrow">
            {total > 0 && <span className="livepulse" style={{ marginRight: 8 }} />}
            Ahora mismo
          </p>
          <h1
            className="phero__title"
            style={{ fontSize: "clamp(2rem,6vw,3.4rem)", margin: "12px 0 6px" }}
          >
            En vivo<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            {total > 0
              ? `${total} partido${total === 1 ? "" : "s"} en juego. Toca cualquiera para ver el detalle.`
              : "Sin partidos en juego ahora mismo."}
          </p>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap">
          <LiveList inicial={grupos} />
        </div>
      </section>
    </main>
  );
}
