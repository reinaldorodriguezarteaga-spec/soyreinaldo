import Link from "next/link";

export const metadata = {
  title: "Contacto | Soy Reinaldo",
  description:
    "Contacta con Reinaldo Rodríguez (@SoyReinaldoR) para colaboraciones de marca, prensa o consultas.",
};

const channels = [
  {
    label: "Email",
    value: "contacto@soyreinaldo.com",
    href: "mailto:contacto@soyreinaldo.com",
    note: "Para colaboraciones, marcas y prensa",
  },
  {
    label: "Instagram",
    value: "@SoyReinaldoR",
    href: "https://instagram.com/SoyReinaldoR",
    note: "DM abierto",
  },
  {
    label: "TikTok",
    value: "@SoyReinaldoR",
    href: "https://tiktok.com/@SoyReinaldoR",
    note: "Donde más rápido te respondo",
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
            Si quieres colaborar, patrocinar contenido o tienes una propuesta,
            escríbeme por el canal que prefieras.
          </p>
        </header>

        <div className="grid gap-3">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={
                c.href.startsWith("mailto:") ? undefined : "noopener noreferrer"
              }
              className="group flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-indigo-300"
            >
              <div>
                <div className="text-xs uppercase tracking-widest text-indigo-300">
                  {c.label}
                </div>
                <div className="mt-2 text-lg font-semibold">{c.value}</div>
                <div className="mt-1 text-xs text-zinc-500">{c.note}</div>
              </div>
              <span className="text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-indigo-300">
                →
              </span>
            </a>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
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
