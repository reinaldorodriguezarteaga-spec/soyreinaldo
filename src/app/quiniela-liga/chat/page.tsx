import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues, pickLeague } from "@/lib/quiniela-liga/leagues";
import ChatQuiniela, { type Mensaje, type Reaccion } from "./chat";

export const metadata: Metadata = {
  title: "Chat de la quiniela | Soy Reinaldo",
  robots: { index: false },
};

const INICIALES = 60;

/** Chat de la liga elegida (migración 092): solo para sus miembros. */
export default async function ChatQuinielaPage({ searchParams }: { searchParams: Promise<{ liga?: string }> }) {
  await connection();
  const { liga } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="page">
        <section className="section">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <p className="panel" style={{ padding: 18 }}>
              <Link href="/login?redirect=/quiniela-liga/chat">Entra</Link> para hablar con la gente de tu quiniela.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const leagues = await getMyClubLeagues(user.id);
  const activa = pickLeague(leagues, liga);
  if (!activa) {
    return (
      <main className="page">
        <section className="section">
          <div className="wrap" style={{ maxWidth: 720 }}>
            <p className="panel" style={{ padding: 18 }}>
              Aún no estás en ninguna quiniela. <Link href="/quiniela-liga">Únete a una</Link> y aquí tendrás su chat.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const [{ data: mensajes }, { data: silencios }, { data: perfil }] = await Promise.all([
    supabase
      .from("lq_chat")
      .select("id, user_id, autor, tipo, texto, oculto, created_at")
      .eq("league_id", activa.id)
      .order("id", { ascending: false })
      .limit(INICIALES),
    supabase.from("lq_chat_silencios").select("silenciado").eq("user_id", user.id),
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle<{ is_admin: boolean | null }>(),
  ]);
  const lista = ((mensajes ?? []) as Mensaje[]).reverse();
  const { data: reacciones } = lista.length
    ? await supabase
        .from("lq_chat_reacciones")
        .select("mensaje_id, user_id, emoji")
        .in(
          "mensaje_id",
          lista.map((m) => m.id),
        )
    : { data: [] };

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 12 }}>
        <div className="wrap" style={{ maxWidth: 760 }}>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.2rem)", margin: "4px 0 10px" }}>
            💬 Chat · {activa.name}
          </h1>
          <ChatQuiniela
            key={activa.id}
            leagueId={activa.id}
            yo={user.id}
            moderador={activa.role === "admin" || perfil?.is_admin === true}
            iniciales={lista}
            reaccionesIniciales={(reacciones ?? []) as Reaccion[]}
            silenciadosIniciales={((silencios ?? []) as { silenciado: string }[]).map((s) => s.silenciado)}
          />
        </div>
      </section>
    </main>
  );
}
