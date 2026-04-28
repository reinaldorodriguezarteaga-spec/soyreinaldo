import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateLeagueForm from "./create-league-form";

export const metadata = {
  title: "Ligas | Admin | Soy Reinaldo",
};

type LeagueWithCount = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  member_count: { count: number }[];
};

export default async function AdminLeaguesPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leagues")
    .select("id, name, code, description, created_at, member_count:league_members(count)")
    .order("created_at", { ascending: false })
    .returns<LeagueWithCount[]>();

  const leagues = data ?? [];

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ligas de la quiniela
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Crea ligas separadas (familiar, amigos, comunidad...) y comparte el
            código de acceso con quien quieras.
          </p>
        </header>

        <section className="mb-12 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8">
          <h2 className="mb-1 text-base font-semibold">Crear nueva liga</h2>
          <p className="mb-5 text-xs text-zinc-500">
            El código se normaliza a mayúsculas. Puedes mantener el sugerido o
            inventar uno (mín. 4 caracteres, solo letras, números y guiones).
          </p>
          <CreateLeagueForm />
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">
              Ligas existentes ({leagues.length})
            </h2>
            {error && (
              <span className="text-xs text-red-300">
                Error cargando ligas: {error.message}
              </span>
            )}
          </div>

          {leagues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/50 p-8 text-center text-sm text-zinc-500">
              Todavía no hay ninguna liga. Crea la primera arriba.
            </div>
          ) : (
            <div className="space-y-3">
              {leagues.map((l) => (
                <article
                  key={l.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold">{l.name}</h3>
                      <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-indigo-300">
                        {l.code}
                      </span>
                    </div>
                    {l.description && (
                      <p className="mt-1 text-sm text-zinc-400">
                        {l.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-zinc-500">
                      {l.member_count?.[0]?.count ?? 0} miembro
                      {(l.member_count?.[0]?.count ?? 0) === 1 ? "" : "s"} ·
                      Creada{" "}
                      {new Date(l.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <Link
                    href={`/admin/ligas/${l.id}`}
                    className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-200 transition hover:border-indigo-300 hover:text-white"
                  >
                    Editar →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 rounded-2xl border border-indigo-400/20 bg-indigo-500/5 p-5 text-sm text-zinc-300">
          <p className="font-medium text-indigo-300">💡 Cómo usar los códigos</p>
          <ul className="mt-2 space-y-1.5 text-zinc-400">
            <li>
              · Comparte el código por WhatsApp, IG o donde sea (no se publica
              en ningún lado).
            </li>
            <li>
              · Quien tenga el código entra en{" "}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs">/quiniela</code>{" "}
              y lo introduce.
            </li>
            <li>
              · Un mismo usuario puede estar en varias ligas a la vez (sus
              pronósticos cuentan en cada una).
            </li>
            <li>
              · Borrar una liga elimina solo la agrupación; los pronósticos de
              los usuarios no se pierden.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
