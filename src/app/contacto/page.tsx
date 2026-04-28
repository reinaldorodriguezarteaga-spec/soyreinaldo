import Image from "next/image";
import Link from "next/link";
import {
  InstagramLogo,
  TikTokLogo,
  YouTubeLogo,
} from "@/components/social-logos";

export const metadata = {
  title: "Contacto | Soy Reinaldo",
  description:
    "Contacta con Reinaldo Rodríguez (@SoyReinaldoR) para colaboraciones de marca, prensa o consultas. Email, teléfono, WhatsApp y redes.",
};

const emails = [
  "reinaldortv@outlook.com",
  "reinaldo_r@live.com",
];

const telefonos = [
  { display: "696 140 935", e164: "+34696140935" },
  { display: "658 751 785", e164: "+34658751785" },
];

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V6.75z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.5 7l9.5 6.5L21.5 7"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-5 w-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 01-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 01-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.337-.688.717-1.032 1.477-1.06 2.476v.158c-.015.99.41 1.964.973 2.762 1.247 1.79 2.853 3.337 4.717 4.466.516.314 1.06.587 1.646.787.46.158.96.358 1.46.358.502 0 .957-.187 1.337-.358.516-.244.957-.63 1.247-1.116.173-.286.317-.602.317-.946 0-.143-.043-.243-.043-.358-.073-.215-.244-.272-.487-.358-.443-.144-1.46-.7-1.66-.7zm.272 9.503c-1.16 0-2.232-.244-3.236-.617L11.16 27.84l1.246-3.78a8.34 8.34 0 01-.96-1.103 8.79 8.79 0 01-1.876-5.395c0-4.86 3.952-8.81 8.812-8.81a8.79 8.79 0 016.225 2.583 8.737 8.737 0 012.587 6.227c0 4.86-3.95 8.812-8.81 8.812zm0-19.376c-5.815 0-10.563 4.733-10.563 10.547 0 1.866.487 3.7 1.418 5.31L8 28.973l5.927-1.547a10.498 10.498 0 005.025 1.276c5.814 0 10.563-4.732 10.563-10.546 0-2.82-1.103-5.466-3.094-7.46a10.486 10.486 0 00-7.456-3.07z"
      />
    </svg>
  );
}

function VerifiedBadge({ color = "#3897F0" }: { color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      aria-label="Verificado"
    >
      <path
        fill={color}
        d="M12 1.5l2.6 1.9 3.2-.4 1 3.1 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3.1-3.2-.4L12 22.5l-2.6-1.9-3.2.4-1-3.1-2.6-1.9 1-3.1-1-3.1 2.6-1.9 1-3.1 3.2.4L12 1.5z"
      />
      <path
        fill="#fff"
        d="M10.5 15.3l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4z"
      />
    </svg>
  );
}

function AvatarWithLogo({
  ring,
  logo,
}: {
  ring?: string;
  logo: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0">
      <Image
        src="/branding/avatar.jpg"
        alt="Reinaldo"
        width={160}
        height={160}
        className={`h-16 w-16 rounded-full object-cover ${
          ring ?? "ring-2 ring-zinc-700"
        }`}
      />
      <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 ring-2 ring-zinc-950">
        {logo}
      </div>
    </div>
  );
}

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

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Email
          </h2>
          <div className="grid gap-3">
            {emails.map((email) => (
              <div
                key={email}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-indigo-300">
                  <MailIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{email}</p>
                </div>
                <a
                  href={`mailto:${email}`}
                  className="shrink-0 rounded-lg bg-indigo-300 px-4 py-2 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
                >
                  Contáctame
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Teléfono
          </h2>
          <div className="grid gap-3">
            {telefonos.map((tel) => (
              <div
                key={tel.e164}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-indigo-300">
                  <PhoneIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium tabular-nums">
                    {tel.display}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1ebe5b]"
                  >
                    <WhatsAppIcon />
                    WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Redes sociales
          </h2>
          <div className="space-y-3">
            <a
              href="https://www.youtube.com/@SoyReinaldoR"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
            >
              <AvatarWithLogo logo={<YouTubeLogo className="h-4 w-4" />} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-base font-semibold sm:text-lg">
                    Fútbol con Reinaldo
                  </h3>
                  <VerifiedBadge color="#FF0000" />
                </div>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  YouTube · 9K suscriptores · +1,2M visualizaciones/mes
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-red-700 sm:px-5 sm:py-2.5 sm:text-sm">
                Suscribirme
              </span>
            </a>

            <a
              href="https://www.instagram.com/soyreinaldor/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
            >
              <div className="relative shrink-0">
                <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 p-[2px]">
                  <Image
                    src="/branding/avatar.jpg"
                    alt="Reinaldo"
                    width={160}
                    height={160}
                    className="block h-[60px] w-[60px] rounded-full bg-zinc-950 object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 ring-2 ring-zinc-950">
                  <InstagramLogo className="h-4 w-4" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-base font-semibold sm:text-lg">
                    @SoyReinaldoR
                  </h3>
                  <VerifiedBadge color="#3897F0" />
                </div>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  Instagram · 54K seguidores · +7,7M visualizaciones/mes
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-600 to-purple-700 px-4 py-2 text-xs font-semibold text-white transition group-hover:opacity-90 sm:px-5 sm:py-2.5 sm:text-sm">
                Seguir
              </span>
            </a>

            <a
              href="https://www.tiktok.com/@soyreinaldor"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700"
            >
              <AvatarWithLogo logo={<TikTokLogo className="h-4 w-4" />} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-base font-semibold sm:text-lg">
                    @SoyReinaldoR
                  </h3>
                  <VerifiedBadge color="#25F4EE" />
                </div>
                <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                  TikTok · 32K seguidores · +4M visualizaciones/mes
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#FE2C55] px-4 py-2 text-xs font-semibold text-white transition group-hover:bg-[#e6234a] sm:px-5 sm:py-2.5 sm:text-sm">
                Seguir
              </span>
            </a>
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
