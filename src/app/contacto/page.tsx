import Link from "next/link";

export const metadata = {
  title: "Contacto | Soy Reinaldo",
  description:
    "Contacta con Reinaldo Rodríguez (@SoyReinaldoR) para colaboraciones de marca, prensa o consultas. Email, teléfono y redes.",
};

const emails = [
  "reinaldortv@outlook.com",
  "reinaldo_r@live.com",
];

const telefonos = [
  { display: "696 140 935", e164: "+34696140935" },
  { display: "658 751 785", e164: "+34658751785" },
];

const redes = [
  {
    label: "Instagram",
    handle: "@SoyReinaldoR",
    href: "https://www.instagram.com/soyreinaldor/",
  },
  {
    label: "TikTok",
    handle: "@SoyReinaldoR",
    href: "https://www.tiktok.com/@soyreinaldor",
  },
  {
    label: "YouTube",
    handle: "Fútbol con Reinaldo",
    href: "https://www.youtube.com/@SoyReinaldoR",
  },
];

export default function ContactoPage() {
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
            Contacto
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Hablemos.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400">
            Para colaboraciones de marca, prensa o consultas. Escríbeme por el
            canal que prefieras.
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Email
          </h2>
          <div className="grid gap-3">
            {emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-indigo-300"
              >
                <span className="text-base font-medium">{email}</span>
                <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Teléfono
          </h2>
          <div className="grid gap-3">
            {telefonos.map((tel) => (
              <div
                key={tel.e164}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-base font-medium tabular-nums">
                  {tel.display}
                </span>
                <div className="flex gap-2">
                  <a
                    href={`tel:${tel.e164}`}
                    className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition hover:border-indigo-300 hover:text-white"
                  >
                    Llamar
                  </a>
                  <a
                    href={`https://wa.me/${tel.e164.replace("+", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-indigo-300 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-indigo-200"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Redes
          </h2>
          <div className="grid gap-3">
            {redes.map((r) => (
              <a
                key={r.label}
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-indigo-300"
              >
                <div>
                  <div className="text-xs uppercase tracking-widest text-indigo-300">
                    {r.label}
                  </div>
                  <div className="mt-1 text-base font-medium">{r.handle}</div>
                </div>
                <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300">
                  →
                </span>
              </a>
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">
            Para propuestas de marcas, te recomiendo echar antes un ojo a mi{" "}
            <Link
              href="/media-kit"
              className="font-medium text-indigo-300 hover:text-indigo-200"
            >
              media kit
            </Link>{" "}
            con audiencia, métricas y tarifas.
          </p>
        </div>
      </div>
    </main>
  );
}
