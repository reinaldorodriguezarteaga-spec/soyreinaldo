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
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="statecard">
            <div className="stateicon stateicon--err">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-7 w-7"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.008v.008H12v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1>No pudimos confirmar tu cuenta</h1>
            <p>{message}</p>

            <div
              className="flex flex-col gap-3 sm:flex-row"
              style={{ marginTop: 24 }}
            >
              <Link
                href="/login"
                className="btn btn--accent w-full justify-center"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/signup"
                className="btn btn--ghost w-full justify-center"
              >
                Reenviar email
              </Link>
            </div>

            <p
              className="notice notice--info"
              style={{ marginTop: 20, textAlign: "left" }}
            >
              Truco: abre el email{" "}
              <strong style={{ color: "var(--text)" }}>
                desde el mismo dispositivo
              </strong>{" "}
              en el que te registraste y haz clic una sola vez. Si tu cliente de
              correo previsualiza enlaces, prueba a copiar y pegar la URL.
            </p>

            <p style={{ marginTop: 24 }}>
              <Link
                href="/"
                className="mono"
                style={{ color: "var(--text-dim)" }}
              >
                ← Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
