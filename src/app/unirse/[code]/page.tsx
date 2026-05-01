import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Unirme a la liga | Soy Reinaldo",
  description:
    "Acepta la invitación para unirte a una liga de la quiniela del Mundial 2026.",
};

type LeaguePreview = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
};

/**
 * Auto-join al hacer click en el link de invitación.
 *
 * Flujo:
 *   1. Si el código no existe → 404 amistoso.
 *   2. Si no estás logueado → redirige a /login y vuelve aquí tras autenticar.
 *   3. Si ya eres miembro → redirige al ranking sin banner.
 *   4. Si no lo eres → llama join_league_by_code (idempotente, RPC) y
 *      redirige al ranking con ?bienvenida=1 para que la página de ranking
 *      muestre un banner "acabas de entrar, ¿salir?".
 */
export default async function JoinByCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { code: rawCode } = await params;
  const { error: errorParam } = await searchParams;
  const code = decodeURIComponent(rawCode).toUpperCase();
  const joinPath = `/unirse/${encodeURIComponent(code)}`;

  const supabase = await createClient();

  const { data: previewRows } = await supabase.rpc(
    "get_league_public_preview",
    { p_code: code },
  );
  const preview = (previewRows?.[0] ?? null) as LeaguePreview | null;

  if (!preview) {
    return <NotFoundView code={code} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(joinPath)}`);
  }

  // ¿Ya era miembro antes de este click? Esto distingue "auto-join nuevo"
  // de "ya estaba dentro hace tiempo" para decidir si mostramos el banner.
  const { data: existingMembership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", preview.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership) {
    redirect(`/quiniela/ranking/${preview.id}`);
  }

  // No era miembro → unir.
  const { error: rpcError } = await supabase.rpc("join_league_by_code", {
    p_code: code,
  });

  if (rpcError) {
    return <JoinErrorView code={code} message={rpcError.message} />;
  }

  redirect(`/quiniela/ranking/${preview.id}?bienvenida=1`);

  // Por TypeScript: redirect() lanza, esto no se alcanza.
  // (Mantenido por si alguna vez la página renderiza un error capturado arriba.)
  return null;
}

function NotFoundView({ code }: { code: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Ir a la quiniela
        </Link>
        <header className="mt-8 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Invitación
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Liga no encontrada
          </h1>
        </header>
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-zinc-400">
            El código{" "}
            <span className="font-mono text-zinc-300">{code}</span> no
            corresponde a ninguna liga. Pídele a quien te haya pasado el enlace
            que lo verifique — es probable que el código se haya cambiado.
          </p>
          <Link
            href="/quiniela"
            className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200"
          >
            Volver a la quiniela →
          </Link>
        </article>
      </div>
    </main>
  );
}

function JoinErrorView({ code, message }: { code: string; message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Ir a la quiniela
        </Link>
        <header className="mt-8 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Invitación
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            No se pudo unir a {code}
          </h1>
        </header>
        <article className="rounded-2xl border border-red-900/60 bg-red-950/20 p-6 text-sm leading-relaxed text-red-200">
          {message}
        </article>
      </div>
    </main>
  );
}
