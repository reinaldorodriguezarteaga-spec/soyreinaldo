import Image from "next/image";
import Link from "next/link";
import StadiumMapClient from "@/components/StadiumMapClient";
import { stadiums } from "@/data/stadiums";

export const metadata = {
  title: "Estadios visitados | Soy Reinaldo",
  description:
    "Mapa interactivo de los estadios que he visitado: Camp Nou, Riyadh Air Metropolitano y Coliseum. Historia, datos y mis recuerdos en cada uno.",
};

export default function EstadiosPage() {
  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Estadios
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Templos que he <span className="text-indigo-300">pisado</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
            Vivir el fútbol en directo es otra cosa. Aquí están los estadios
            que he visitado, con su historia y mis recuerdos en cada uno.
          </p>
        </header>

        <section className="mb-20">
          <StadiumMapClient stadiums={stadiums} />
          <p className="mt-3 text-xs text-zinc-500">
            Pulsa un marcador para abrir el detalle, o desplázate hacia abajo.
          </p>
        </section>

        <div className="space-y-20">
          {stadiums.map((s) => (
            <section key={s.slug} id={s.slug} className="scroll-mt-24">
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">
                  {s.club} · {s.city}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {s.name}
                </h2>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-500">
                  <span>Inaugurado en {s.founded}</span>
                  <span aria-hidden>·</span>
                  <span>
                    Capacidad: {s.capacity.toLocaleString("es-ES")}
                  </span>
                </div>
              </div>

              <p className="mb-6 text-base leading-relaxed text-zinc-300">
                {s.description}
              </p>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
                <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Historia
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                  {s.history}
                </p>
              </div>

              {s.visitImages.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
                    Mi visita
                  </h3>
                  <div
                    className={`grid gap-3 ${
                      s.visitImages.length > 1
                        ? "sm:grid-cols-2 lg:grid-cols-3"
                        : "sm:grid-cols-2"
                    }`}
                  >
                    {s.visitImages.map((img, idx) => (
                      <div
                        key={img}
                        className="relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900"
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
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
