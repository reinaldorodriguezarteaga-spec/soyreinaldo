import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Editor, { type Borrador } from "./editor";
import { borrarAnalisis } from "./actions";

export const metadata = { title: "Análisis | Admin | Soy Reinaldo" };

type Fila = {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  fixture_id: number | null;
  competition_slug: string | null;
  updated_at: string;
};

export default async function AdminAnalisis({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string; guardado?: string }>;
}) {
  const { editar, guardado } = await searchParams;
  const supabase = await createClient();

  // La RLS deja ver los borradores solo al admin; si alguien más llega aquí,
  // sencillamente no verá nada que editar.
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, published_at, fixture_id, competition_slug, updated_at")
    .order("updated_at", { ascending: false })
    .returns<Fila[]>();
  const articulos = data ?? [];

  const { data: enEdicion } = editar
    ? await supabase
        .from("articles")
        .select("id, slug, title, excerpt, body, cover_url, fixture_id, competition_slug, published_at")
        .eq("id", editar)
        .maybeSingle<Borrador>()
    : { data: null };

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Admin · Análisis
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {enEdicion ? "Editar análisis" : "Escribir"}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Lo que escribas aquí es lo único de la web que la competencia no
            puede copiar. Se publica en{" "}
            <Link href="/analisis" className="text-indigo-300">/analisis</Link> y,
            si lo enganchas a un partido, también dentro de su ficha.
          </p>
          {guardado === "1" && (
            <p className="mt-3 rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-300">
              Guardado.
            </p>
          )}
        </header>

        <Editor borrador={enEdicion ?? undefined} />

        {enEdicion && (
          <p className="mt-4 text-sm">
            <Link href="/admin/analisis" className="text-zinc-400 hover:text-zinc-200">
              ← Dejar de editar y escribir uno nuevo
            </Link>
          </p>
        )}

        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            Publicados y borradores ({articulos.length})
          </h2>
          {articulos.length === 0 ? (
            <p className="text-sm text-zinc-500">Todavía no has escrito nada.</p>
          ) : (
            <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800">
              {articulos.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      a.published_at
                        ? "bg-emerald-950 text-emerald-300"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {a.published_at ? "publicado" : "borrador"}
                  </span>
                  <span className="flex-1 text-sm">{a.title}</span>
                  {a.published_at && (
                    <Link
                      href={`/analisis/${a.slug}`}
                      className="text-xs text-zinc-400 hover:text-zinc-200"
                    >
                      ver
                    </Link>
                  )}
                  <Link
                    href={`/admin/analisis?editar=${a.id}`}
                    className="text-xs text-indigo-300 hover:text-indigo-200"
                  >
                    editar
                  </Link>
                  <form action={borrarAnalisis}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="text-xs text-red-400 hover:text-red-300">
                      borrar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
