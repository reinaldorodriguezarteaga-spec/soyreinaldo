import Image from "next/image";
import StadiumMapClient from "@/components/StadiumMapClient";
import { stadiums } from "@/data/stadiums";

export const metadata = {
  title: "Estadios | Soy Reinaldo",
  description:
    "Mapa interactivo de los estadios que he visitado: Camp Nou, Riyadh Air Metropolitano y Coliseum. Historia, datos y mis recuerdos en cada uno.",
};

export default function EstadiosPage() {
  return (
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Estadios</p>
          <h1 className="phero__title">
            Templos que<br />he pisado<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Vivir el fútbol en directo es otra cosa. Aquí están los estadios que
            he visitado, con su historia y mis recuerdos en cada uno.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="panel" style={{ overflow: "hidden", padding: 0 }}>
            <StadiumMapClient stadiums={stadiums} />
          </div>
          <p style={{ marginTop: 12, fontSize: "0.78rem", color: "var(--text-dim)" }}>
            Pulsa un marcador para abrir el detalle, o desplázate hacia abajo.
          </p>

          <div style={{ marginTop: 64, display: "flex", flexDirection: "column", gap: 72 }}>
            {stadiums.map((s) => (
              <section key={s.slug} id={s.slug} className="scroll-mt-24">
                <p className="eyebrow">
                  {s.club} · {s.city}
                </p>
                <h2 className="stadium__name" style={{ fontSize: "clamp(2rem,4vw,3rem)", marginTop: 12 }}>
                  {s.name}
                </h2>
                <div
                  className="mono"
                  style={{ marginTop: 10, color: "var(--text-dim)", display: "flex", gap: 18, flexWrap: "wrap", letterSpacing: "0.1em" }}
                >
                  <span>Inaugurado en {s.founded}</span>
                  <span>Capacidad {s.capacity.toLocaleString("es-ES")}</span>
                </div>

                <p style={{ margin: "20px 0", lineHeight: 1.7, color: "var(--text)" }}>
                  {s.description}
                </p>

                <div className="panel" style={{ padding: 24 }}>
                  <h3 className="mono" style={{ color: "var(--accent)" }}>Historia</h3>
                  <p style={{ marginTop: 12, lineHeight: 1.7, color: "var(--text-dim)" }}>
                    {s.history}
                  </p>
                </div>

                {(s.heroImage || s.visitImages.length > 0) && (
                  <div style={{ marginTop: 28 }}>
                    <h3 className="mono" style={{ color: "var(--text-dim)", marginBottom: 14 }}>
                      Mi visita
                    </h3>
                    {s.heroImage && (
                      <div
                        className="panel"
                        style={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", marginBottom: 12 }}
                      >
                        <Image
                          src={s.heroImage}
                          alt={`${s.name} — vista desde la grada`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 800px"
                          priority
                        />
                      </div>
                    )}
                    {s.visitImages.length > 0 && (
                      <div className={s.visitImages.length > 1 ? "grid3" : "grid2"}>
                        {s.visitImages.map((img, idx) => (
                          <div
                            key={img}
                            className="panel"
                            style={{ position: "relative", aspectRatio: "3 / 4", overflow: "hidden" }}
                          >
                            <Image
                              src={img}
                              alt={`${s.name} — visita ${idx + 1}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
