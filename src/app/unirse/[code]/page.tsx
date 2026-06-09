import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite, dismissInvite } from "./actions";

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
    <main className="page">
      <div className="wrap">
        <div className="statewrap">
          <div className="auth">
            <p className="eyebrow" style={{ justifyContent: "center" }}>
              Invitación
            </p>
            <h1
              className="display"
              style={{
                fontSize: "clamp(2rem,5vw,2.8rem)",
                textAlign: "center",
                margin: "12px 0 26px",
              }}
            >
              {preview ? (
                <>
                  Únete a{" "}
                  <span style={{ color: "var(--accent)" }}>{preview.name}</span>
                </>
              ) : (
                "Liga no encontrada"
              )}
            </h1>

            {!preview ? (
              <NotFound code={code} />
            ) : (
              <article className="auth__card">
                <div className="mb-4 flex items-center justify-between">
                  <span className="codepill">{code}</span>
                  <span className="mono" style={{ color: "var(--text-dim)" }}>
                    {preview.member_count}{" "}
                    {preview.member_count === 1 ? "miembro" : "miembros"}
                  </span>
                </div>

                {preview.description && (
                  <p
                    style={{
                      marginBottom: 20,
                      color: "var(--text-dim)",
                      fontSize: "0.92rem",
                      lineHeight: 1.6,
                    }}
                  >
                    {preview.description}
                  </p>
                )}

                {errorParam && (
                  <p className="notice notice--err" style={{ marginBottom: 16 }}>
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

            <p style={{ textAlign: "center", marginTop: 22 }}>
              <Link
                href="/quiniela"
                className="mono"
                style={{ color: "var(--text-dim)" }}
              >
                ← Ir a la quiniela
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function NotFound({ code }: { code: string }) {
  return (
    <article className="auth__card">
      <p style={{ color: "var(--text-dim)", fontSize: "0.92rem", lineHeight: 1.6 }}>
        El código <span className="mono" style={{ color: "var(--text)" }}>{code}</span>{" "}
        no corresponde a ninguna liga. Pídele a quien te haya pasado el enlace
        que lo verifique — es probable que el código se haya cambiado.
      </p>
      <form action={dismissInvite} style={{ marginTop: 22 }}>
        <input type="hidden" name="target" value="/quiniela" />
        <button
          type="submit"
          className="mono"
          style={{ background: "transparent", border: 0, color: "var(--accent)", cursor: "pointer" }}
        >
          Volver a la quiniela →
        </button>
      </form>
    </article>
  );
}

function NotLoggedIn({ joinPath }: { joinPath: string }) {
  const next = encodeURIComponent(joinPath);
  return (
    <div className="space-y-3">
      <p style={{ color: "var(--text-dim)", fontSize: "0.92rem" }}>
        Tienes que iniciar sesión para entrar a esta liga.
      </p>
      <Link
        href={`/login?redirect=${next}`}
        className="btn btn--accent w-full justify-center"
      >
        Entrar y unirme
      </Link>
      <Link
        href={`/signup?redirect=${next}`}
        className="btn btn--ghost w-full justify-center"
      >
        Crear cuenta
      </Link>
    </div>
  );
}

function AlreadyMember({ leagueId }: { leagueId: string }) {
  return (
    <div className="space-y-3">
      <p className="notice notice--ok">Ya estás dentro de esta liga.</p>
      <form action={dismissInvite}>
        <input
          type="hidden"
          name="target"
          value={`/quiniela/ranking/${leagueId}`}
        />
        <button type="submit" className="btn btn--accent w-full justify-center">
          Ver ranking
        </button>
      </form>
    </div>
  );
}

function ConfirmJoin({ code }: { code: string }) {
  return (
    <form action={acceptInvite} className="space-y-3">
      <input type="hidden" name="code" value={code} />
      <button type="submit" className="btn btn--accent w-full justify-center">
        Unirme a la liga
      </button>
      <p
        className="mono"
        style={{ textAlign: "center", color: "var(--text-dim)" }}
      >
        Podrás salirte cuando quieras desde la quiniela.
      </p>
    </form>
  );
}
