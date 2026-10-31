import { Clapperboard } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decodificar } from "@/lib/pizarra/estado";
import MiniCampo from "./mini-campo";
import { BotonLike, BotonRetirar } from "./botones";

export const metadata: Metadata = {
  title: "Pizarras de la comunidad: jugadas y análisis tácticos | Soy Reinaldo",
  description:
    "Las pizarras tácticas que publica la comunidad de soyreinaldo.com: ábrelas, cámbialas y comparte tu propio análisis.",
  alternates: { canonical: "/pizarra/comunidad" },
};

type Fila = {
  id: string;
  titulo: string;
  local_id: number;
  local_nombre: string;
  local_logo: string;
  /** Null en las pizarras de un solo equipo (migración 099). */
  visitante_id: number | null;
  visitante_nombre: string | null;
  visitante_logo: string | null;
  partido_id: number | null;
  estado: string;
  created_at: string;
  autor: string;
  likes: number;
  mio: boolean;
  le_gusta: boolean;
};

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" }).format(new Date(iso));

/** Galería de pizarras publicadas (20-oct, punto 4 del análisis de JLA). */
export default async function ComunidadPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden: pedido } = await searchParams;
  const orden = pedido === "populares" ? "populares" : "recientes";
  const supabase = await createClient();
  const [{ data }, {
    data: { user },
  }] = await Promise.all([
    supabase.rpc("pizarras_comunidad", { p_orden: orden, p_limite: 48 }),
    supabase.auth.getUser(),
  ]);
  const { data: perfil } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle<{ is_admin: boolean }>()
    : { data: null };
  const admin = !!perfil?.is_admin;
  const filas = (data ?? []) as Fila[];

  return (
    <main className="page">
      <section className="section" style={{ paddingTop: 28 }}>
        <div className="wrap">
          <p className="eyebrow">
            <Link href="/pizarra">Pizarra táctica</Link>
          </p>
          <h1 className="feat__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", margin: "4px 0 6px" }}>
            Pizarras de la comunidad
          </h1>
          <p style={{ color: "var(--text-dim)", margin: "0 0 16px", maxWidth: 640 }}>
            Jugadas y análisis que ha publicado la gente. Ábrelas para verlas en grande, cámbialas a tu gusto
            y comparte la tuya.
          </p>
          <div className="pzc-barra">
            <div className="tabs" style={{ maxWidth: 260 }}>
              <Link href="/pizarra/comunidad" className={orden === "recientes" ? "on" : ""}>
                Recientes
              </Link>
              <Link href="/pizarra/comunidad?orden=populares" className={orden === "populares" ? "on" : ""}>
                Populares
              </Link>
            </div>
            <Link href="/pizarra" className="btn btn--accent">
              + Crear la tuya
            </Link>
          </div>

          {filas.length === 0 ? (
            <div className="panel" style={{ padding: 24, textAlign: "center", color: "var(--text-dim)" }}>
              Todavía no hay pizarras publicadas. ¡Sé el primero!
            </div>
          ) : (
            <div className="pzc-rejilla">
              {filas.map((f) => {
                const estado = decodificar(f.estado, null);
                const href = `/pizarra?local=${f.local_id}${f.visitante_id ? `&visitante=${f.visitante_id}` : ""}${
                  f.partido_id ? `&partido=${f.partido_id}` : ""
                }&p=${f.estado}`;
                return (
                  <article key={f.id} className="panel pzc-tarjeta">
                    <Link href={href} className="pzc-tarjeta__enlace" prefetch={false}>
                      {estado && <MiniCampo estado={estado} />}
                      <h2 className="pzc-titulo">{f.titulo}</h2>
                      <p className="pzc-equipos">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.local_logo} alt="" width={16} height={16} /> {f.local_nombre}
                        {f.visitante_id != null && (
                          <>
                            <span className="mono"> vs </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.visitante_logo ?? ""} alt="" width={16} height={16} /> {f.visitante_nombre}
                          </>
                        )}
                      </p>
                    </Link>
                    <footer className="pzc-pie">
                      <span className="pzc-autor">
                        {f.autor} · {fecha(f.created_at)}
                        {estado && estado.etapas.length > 1 && <span className="pzc-anim"> · <Clapperboard className="ico-txt" aria-hidden /> animada</span>}
                      </span>
                      <BotonLike id={f.id} likes={f.likes} leGusta={f.le_gusta} conectado={!!user} />
                      {(f.mio || admin) && <BotonRetirar id={f.id} comoAdmin={!f.mio && admin} />}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
