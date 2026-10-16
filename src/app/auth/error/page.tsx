import Link from "next/link";

export const metadata = {
  title: "Error de confirmación | Soy Reinaldo",
};

function readableReason(reason?: string) {
  if (!reason) return "El enlace no es válido o ha caducado.";
  const r = reason.toLowerCase();
  // Enlace abierto en otro navegador (registro en la app, correo en Chrome):
  // Supabase ya confirmó el email antes de redirigir, solo falta la sesión.
  if (r.includes("code verifier") || r.includes("pkce")) {
    return "Tu cuenta ya está confirmada. Como abriste el enlace en otro navegador, no pudimos iniciar la sesión aquí: entra con tu email y contraseña y listo.";
  }
  if (r.includes("expired") || r.includes("invalid")) {
    return "Este enlace ya se usó o ha caducado: duran una hora y valen una sola vez. Si ya lo habías pulsado antes, tu cuenta seguramente está confirmada: prueba a iniciar sesión. Si no puedes entrar, pide un enlace nuevo.";
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
  const yaConfirmada = /code verifier|pkce/i.test(reason ?? "");

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

            <h1>
              {yaConfirmada ? "Cuenta confirmada: inicia sesión" : "No pudimos confirmar tu cuenta"}
            </h1>
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
              {!yaConfirmada && (
                <Link
                  href="/auth/reenviar"
                  className="btn btn--ghost w-full justify-center"
                >
                  Pedir un enlace nuevo
                </Link>
              )}
            </div>

            {!yaConfirmada && (
            <p
              className="notice notice--info"
              style={{ marginTop: 20, textAlign: "left" }}
            >
              Truco: algunos correos (Outlook o ciertos antivirus) abren los
              enlaces solos para revisarlos y los gastan antes que tú. Si te
              pasa, pide uno nuevo y pulsa en él nada más llegar.
            </p>
            )}

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
