import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Darse de baja | Soy Reinaldo",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let outcome: "success" | "missing" | "invalid" | "error" = "missing";
  let displayName: string | null = null;

  if (!token) {
    outcome = "missing";
  } else if (!supabaseUrl || !serviceRoleKey) {
    outcome = "error";
  } else {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
      .from("profiles")
      .update({ wants_reminders: false })
      .eq("unsubscribe_token", token)
      .select("display_name")
      .maybeSingle();

    if (error) {
      outcome = "error";
    } else if (!data) {
      outcome = "invalid";
    } else {
      outcome = "success";
      displayName = (data as { display_name: string | null }).display_name;
    }
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="statecard">
            {outcome === "success" ? (
              <>
                <div className="stateicon">📭</div>
                <h1>Listo{displayName ? `, ${displayName}` : ""}.</h1>
                <p>
                  No te enviaré más recordatorios por email. Si cambias de idea,
                  puedes activarlos otra vez en{" "}
                  <Link
                    href="/completar-perfil"
                    style={{ color: "var(--accent)" }}
                  >
                    tu perfil
                  </Link>
                  .
                </p>
              </>
            ) : outcome === "invalid" ? (
              <>
                <div className="stateicon">🤔</div>
                <h1>Link no válido</h1>
                <p>
                  Este enlace no corresponde a ninguna cuenta. Si quieres
                  gestionar tus recordatorios, entra a tu cuenta y ve a{" "}
                  <Link
                    href="/completar-perfil"
                    style={{ color: "var(--accent)" }}
                  >
                    tu perfil
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <div className="stateicon">⚠️</div>
                <h1>Algo no fue bien</h1>
                <p>
                  No pude darte de baja en este momento. Inténtalo otra vez en
                  unos minutos o escríbeme a hola@soyreinaldo.com.
                </p>
              </>
            )}

            <p style={{ marginTop: 28 }}>
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
