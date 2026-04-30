import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditLeagueForm from "./edit-league-form";
import AddAdjustmentForm from "./add-adjustment-form";
import CopyJoinLink from "./copy-join-link";
import {
  deleteLeague,
  kickMember,
  deleteAdjustment,
} from "../actions";

export const metadata = {
  title: "Editar liga | Admin | Soy Reinaldo",
};

type LeagueRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
};

type MemberRow = {
  user_id: string;
  joined_at: string;
};

type AdjustmentRow = {
  id: string;
  user_id: string;
  delta: number;
  reason: string;
  created_at: string;
};

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code, description, created_at")
    .eq("id", id)
    .maybeSingle<LeagueRow>();

  if (!league) notFound();

  // Members — la FK de league_members va a auth.users, no a profiles, así
  // que PostgREST no puede embebir profiles directamente. Hacemos las dos
  // queries y unimos en TS.
  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, joined_at")
    .eq("league_id", id)
    .order("joined_at", { ascending: true })
    .returns<MemberRow[]>();

  const memberIds = (members ?? []).map((m) => m.user_id);
  const { data: memberProfiles } = memberIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberIds)
        .returns<{ id: string; display_name: string | null }[]>()
    : { data: [] };

  const profileByUser = new Map(
    (memberProfiles ?? []).map((p) => [p.id, p.display_name ?? "Sin nombre"]),
  );

  const memberList = (members ?? []).map((m) => ({
    user_id: m.user_id,
    display_name: profileByUser.get(m.user_id) ?? "Sin nombre",
    joined_at: m.joined_at,
  }));

  // Adjustments — mismo motivo que arriba: la FK va a auth.users, dos queries.
  const { data: adjustments } = await supabase
    .from("point_adjustments")
    .select("id, user_id, delta, reason, created_at")
    .eq("league_id", id)
    .order("created_at", { ascending: false })
    .returns<AdjustmentRow[]>();

  const adjustmentUserIds = Array.from(
    new Set((adjustments ?? []).map((a) => a.user_id)),
  );
  const { data: adjustmentProfiles } = adjustmentUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", adjustmentUserIds)
        .returns<{ id: string; display_name: string | null }[]>()
    : { data: [] };
  const adjProfileByUser = new Map(
    (adjustmentProfiles ?? []).map((p) => [p.id, p.display_name ?? "Sin nombre"]),
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href="/admin/ligas"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver a la lista
        </Link>

        <header className="mt-6 mb-10">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {league.name}
            </h1>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 font-mono text-sm text-indigo-300">
              {league.code}
            </span>
          </div>
          {league.description && (
            <p className="mt-2 text-sm text-zinc-400">{league.description}</p>
          )}
        </header>

        <section className="mb-6">
          <CopyJoinLink code={league.code} />
        </section>

        <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <h2 className="mb-1 text-base font-semibold">Datos de la liga</h2>
          <p className="mb-5 text-xs text-zinc-500">
            Cambiar el código revoca el acceso a quien tuviera el anterior y
            no se haya unido todavía. Los miembros existentes siguen dentro.
          </p>
          <EditLeagueForm league={league} />
        </section>

        <section className="mb-10">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">
              Miembros ({memberList.length})
            </h2>
          </div>
          {memberList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center text-sm text-zinc-500">
              Sin miembros aún. Comparte el código{" "}
              <span className="font-mono text-indigo-300">{league.code}</span>{" "}
              para que entre alguien.
            </div>
          ) : (
            <div className="space-y-2">
              {memberList.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{m.display_name}</p>
                    <p className="text-xs text-zinc-500">
                      Entró {new Date(m.joined_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <form action={kickMember}>
                    <input type="hidden" name="league_id" value={league.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:border-red-500 hover:text-red-200"
                      title="Expulsar de la liga"
                    >
                      Expulsar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-base font-semibold">Ajustes de puntos</h2>
          <p className="mb-5 text-xs text-zinc-500">
            Aplica penalizaciones (números negativos) o bonus (positivos) a un
            miembro de esta liga. No afecta a otras ligas. Cada ajuste queda
            registrado con su motivo.
          </p>

          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <AddAdjustmentForm leagueId={league.id} members={memberList} />
          </div>

          {!adjustments || adjustments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center text-sm text-zinc-500">
              Sin ajustes de momento.
            </div>
          ) : (
            <div className="space-y-2">
              {adjustments.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          a.delta < 0 ? "text-red-300" : "text-emerald-300"
                        }`}
                      >
                        {a.delta > 0 ? "+" : ""}
                        {a.delta}
                      </span>
                      <span className="text-sm font-medium">
                        {adjProfileByUser.get(a.user_id) ?? "Sin nombre"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-400">{a.reason}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-600">
                      {new Date(a.created_at).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <form action={deleteAdjustment} className="shrink-0">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="league_id" value={league.id} />
                    <button
                      type="submit"
                      className="text-xs text-zinc-500 transition hover:text-red-300"
                    >
                      Quitar
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-900/50 bg-red-950/10 p-6">
          <h2 className="text-sm font-semibold text-red-300">Zona peligrosa</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Borrar la liga elimina la agrupación y el ranking. Los pronósticos
            individuales de los usuarios siguen guardados; los ajustes de
            puntos de esta liga se borran.
          </p>
          <form action={deleteLeague} className="mt-4">
            <input type="hidden" name="id" value={league.id} />
            <button
              type="submit"
              className="rounded-xl border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-500 hover:bg-red-900/40"
            >
              Borrar liga
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
