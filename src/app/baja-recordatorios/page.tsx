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
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        {outcome === "success" ? (
          <>
            <p className="text-5xl">📭</p>
            <h1 className="mt-6 text-2xl font-semibold">
              Listo{displayName ? `, ${displayName}` : ""}.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              No te enviaré más recordatorios por email. Si cambias de idea,
              puedes activarlos otra vez en{" "}
              <Link
                href="/completar-perfil"
                className="text-indigo-300 hover:text-indigo-200"
              >
                tu perfil
              </Link>
              .
            </p>
          </>
        ) : outcome === "invalid" ? (
          <>
            <p className="text-5xl">🤔</p>
            <h1 className="mt-6 text-2xl font-semibold">Link no válido</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Este enlace no corresponde a ninguna cuenta. Si quieres
              gestionar tus recordatorios, entra a tu cuenta y ve a{" "}
              <Link
                href="/completar-perfil"
                className="text-indigo-300 hover:text-indigo-200"
              >
                tu perfil
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl">⚠️</p>
            <h1 className="mt-6 text-2xl font-semibold">
              Algo no fue bien
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              No pude darte de baja en este momento. Inténtalo otra vez en
              unos minutos o escríbeme a hola@soyreinaldo.com.
            </p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-block text-xs text-zinc-500 hover:text-white"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
