import Link from "next/link";

export const metadata = {
  title: "Error de confirmación | Soy Reinaldo",
};

function readableReason(reason?: string) {
  if (!reason) return "El enlace no es válido o ha caducado.";
  const r = reason.toLowerCase();
  if (r.includes("expired") || r.includes("invalid")) {
    return "El enlace ha caducado o ya se usó. Esto suele pasar cuando el cliente de correo (Gmail, Outlook) abre el link automáticamente para previsualizarlo.";
  }
  if (r.includes("token")) {
    return "El token de confirmación no es válido.";
  }
  return reason;
}

type SearchParams = Promise<{ reason?: string }>;

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { reason } = await searchParams;
  const message = readableReason(reason);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-6 w-6"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            No pudimos confirmar tu cuenta
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {message}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex-1 rounded-xl bg-indigo-300 px-4 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="flex-1 rounded-xl border border-zinc-800 px-4 py-3 text-center text-sm font-semibold text-zinc-300 transition hover:border-indigo-300 hover:text-white"
            >
              Reenviar email
            </Link>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-zinc-500">
            Truco: abre el email <strong>desde el mismo dispositivo</strong> en
            el que te registraste y haz clic una sola vez. Si tu cliente de
            correo previsualiza enlaces, prueba a copiar y pegar la URL.
          </p>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-white"
          >
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}
