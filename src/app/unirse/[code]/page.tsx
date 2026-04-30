import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

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

  const supabase = await createClient();

  const { data: previewRows } = await supabase.rpc(
    "get_league_public_preview",
    { p_code: code },
  );
  const preview = (previewRows?.[0] ?? null) as LeaguePreview | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let alreadyMember = false;
  if (user && preview) {
    const { data: existing } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", preview.id)
      .eq("user_id", user.id)
      .maybeSingle();
    alreadyMember = !!existing;
  }

  const joinPath = `/unirse/${encodeURIComponent(code)}`;

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
            {preview ? (
              <>
                Únete a{" "}
                <span className="text-indigo-300">{preview.name}</span>
              </>
            ) : (
              "Liga no encontrada"
            )}
          </h1>
        </header>

        {!preview ? (
          <NotFound code={code} />
        ) : (
          <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
            <div className="mb-4 flex items-center justify-between">
              <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-xs text-indigo-300">
                {code}
              </span>
              <span className="text-xs text-zinc-500">
                {preview.member_count}{" "}
                {preview.member_count === 1 ? "miembro" : "miembros"}
              </span>
            </div>

            {preview.description && (
              <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                {preview.description}
              </p>
            )}

            {errorParam && (
              <p className="mb-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">
                {errorParam}
              </p>
            )}

            {!user ? (
              <NotLoggedIn joinPath={joinPath} />
            ) : alreadyMember ? (
              <AlreadyMember leagueId={preview.id} />
            ) : (
              <ConfirmJoin code={code} />
            )}
          </article>
        )}
      </div>
    </main>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
      <p className="text-sm leading-relaxed text-zinc-400">
        El código{" "}
        <span className="font-mono text-zinc-300">{code}</span> no corresponde
        a ninguna liga. Pídele a quien te haya pasado el enlace que lo
        verifique — es probable que el código se haya cambiado.
      </p>
      <Link
        href="/quiniela"
        className="mt-6 inline-block text-sm font-medium text-indigo-300 hover:text-indigo-200"
      >
        Volver a la quiniela →
      </Link>
    </article>
  );
}

function NotLoggedIn({ joinPath }: { joinPath: string }) {
  const next = encodeURIComponent(joinPath);
  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">
        Tienes que iniciar sesión para entrar a esta liga.
      </p>
      <Link
        href={`/login?redirect=${next}`}
        className="block w-full rounded-xl bg-indigo-300 px-4 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
      >
        Entrar y unirme
      </Link>
      <Link
        href={`/signup?redirect=${next}`}
        className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-zinc-200 transition hover:border-zinc-700 hover:text-white"
      >
        Crear cuenta
      </Link>
    </div>
  );
}

function AlreadyMember({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-emerald-300">
        Ya estás dentro de esta liga.
      </p>
      <Link
        href={`/quiniela/ranking/${leagueId}`}
        className="block w-full rounded-xl bg-indigo-300 px-4 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
      >
        Ver ranking
      </Link>
    </div>
  );
}

function ConfirmJoin({ code }: { code: string }) {
  return (
    <form action={acceptInvite} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        className="block w-full rounded-xl bg-indigo-300 px-4 py-3 text-center text-sm font-semibold text-zinc-950 transition hover:bg-indigo-200"
      >
        Unirme a la liga
      </button>
      <p className="text-center text-xs text-zinc-500">
        Podrás salirte cuando quieras desde la quiniela.
      </p>
    </form>
  );
}
