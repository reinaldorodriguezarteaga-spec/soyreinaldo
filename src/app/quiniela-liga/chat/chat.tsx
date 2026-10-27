"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMOJIS, MAX_TEXTO, type Emoji } from "@/lib/quiniela-liga/chat";
import { borrarMensaje, enviarMensaje, reaccionar, reportarMensaje, silenciar } from "./acciones";

export type Mensaje = {
  id: number;
  user_id: string | null;
  autor: string | null;
  tipo: "usuario" | "sistema";
  texto: string;
  oculto: boolean;
  created_at: string;
};
export type Reaccion = { mensaje_id: number; user_id: string; emoji: Emoji };

const hora = (iso: string) => {
  const d = new Date(iso);
  const hoy = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat("es-ES", hoy ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
};

/**
 * Chat de una quiniela (27-oct): mensajes y reacciones en tiempo real
 * (Supabase Realtime, con la RLS de lectura de la migración 092). Si el
 * tiempo real no conecta, se piden los nuevos cada 15 s.
 */
export default function ChatQuiniela({
  leagueId,
  yo,
  moderador,
  iniciales,
  reaccionesIniciales,
  silenciadosIniciales,
}: {
  leagueId: string;
  yo: string;
  moderador: boolean;
  iniciales: Mensaje[];
  reaccionesIniciales: Reaccion[];
  silenciadosIniciales: string[];
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>(iniciales);
  const [reacciones, setReacciones] = useState<Reaccion[]>(reaccionesIniciales);
  const [silenciados, setSilenciados] = useState<string[]>(silenciadosIniciales);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [menu, setMenu] = useState<number | null>(null);
  const [selector, setSelector] = useState<number | null>(null);
  const [conectado, setConectado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const pegadoAbajo = useRef(true);

  const meter = useCallback((nuevos: Mensaje[]) => {
    setMensajes((prev) => {
      const porId = new Map(prev.map((m) => [m.id, m]));
      for (const m of nuevos) porId.set(m.id, m);
      return [...porId.values()].sort((a, b) => a.id - b.id).slice(-300);
    });
  }, []);

  // Tiempo real: mensajes nuevos, ocultados y reacciones de esta liga.
  useEffect(() => {
    const sb = createClient();
    const canal = sb
      .channel(`chat-${leagueId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lq_chat", filter: `league_id=eq.${leagueId}` }, (p) => {
        if (p.new && "id" in p.new) meter([p.new as Mensaje]);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "lq_chat_reacciones", filter: `league_id=eq.${leagueId}` }, (p) => {
        const r = p.new as Reaccion;
        setReacciones((prev) => (prev.some((x) => x.mensaje_id === r.mensaje_id && x.user_id === r.user_id && x.emoji === r.emoji) ? prev : [...prev, r]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "lq_chat_reacciones", filter: `league_id=eq.${leagueId}` }, (p) => {
        const r = p.old as Reaccion;
        setReacciones((prev) => prev.filter((x) => !(x.mensaje_id === r.mensaje_id && x.user_id === r.user_id && x.emoji === r.emoji)));
      })
      .subscribe((estado) => setConectado(estado === "SUBSCRIBED"));
    return () => {
      void sb.removeChannel(canal);
    };
  }, [leagueId, meter]);

  const traerNuevos = useCallback(async () => {
    const ultimo = mensajes.at(-1)?.id ?? 0;
    const { data } = await createClient()
      .from("lq_chat")
      .select("id, user_id, autor, tipo, texto, oculto, created_at")
      .eq("league_id", leagueId)
      .gt("id", ultimo)
      .order("id")
      .limit(50);
    if (data?.length) meter(data as Mensaje[]);
  }, [leagueId, mensajes, meter]);

  // Respaldo sin tiempo real.
  useEffect(() => {
    if (conectado) return;
    const t = setInterval(() => {
      if (!document.hidden) void traerNuevos();
    }, 15_000);
    return () => clearInterval(t);
  }, [conectado, traerNuevos]);

  // Abajo del todo al llegar mensajes, salvo si estabas leyendo arriba.
  useEffect(() => {
    const el = caja.current;
    if (el && pegadoAbajo.current) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  const enviar = async () => {
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await enviarMensaje(leagueId, texto).catch(() => ({ ok: false as const, error: "No se pudo enviar." }));
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setTexto("");
    pegadoAbajo.current = true;
    if (!conectado) void traerNuevos();
  };

  const accion = async (f: () => Promise<{ ok: boolean; error?: string }>, aviso?: string) => {
    setMenu(null);
    setSelector(null);
    const r = await f().catch(() => ({ ok: false, error: "No se pudo." }));
    setError(r.ok ? (aviso ?? null) : (r.error ?? "No se pudo."));
  };

  const visibles = mensajes.filter((m) => !(m.user_id && silenciados.includes(m.user_id)));
  const nombres = new Map(mensajes.filter((m) => m.user_id).map((m) => [m.user_id!, m.autor ?? "Alguien"]));

  return (
    <div className="chat panel">
      <div
        className="chat__lista"
        ref={caja}
        onScroll={(e) => {
          const el = e.currentTarget;
          pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {visibles.length === 0 && (
          <p className="chat__vacio">Aún no hay mensajes. ¡Rompe el hielo! Aquí también salen los exactos de cada partido y los retos.</p>
        )}
        {visibles.map((m) => {
          if (m.tipo === "sistema") {
            return (
              <p key={m.id} className="chat__sistema">
                {m.texto} <span>{hora(m.created_at)}</span>
              </p>
            );
          }
          const mio = m.user_id === yo;
          const suyas = reacciones.filter((r) => r.mensaje_id === m.id);
          const cuenta = EMOJIS.map((e) => ({ e, n: suyas.filter((r) => r.emoji === e).length, mia: suyas.some((r) => r.emoji === e && r.user_id === yo) })).filter((x) => x.n > 0);
          return (
            <div key={m.id} className={`chat__msg${mio ? " is-mio" : ""}`}>
              <div className="chat__burbuja">
                {!mio && <b className="chat__autor">{m.autor ?? "Alguien"}</b>}
                {m.oculto ? <i className="chat__borrado">Mensaje eliminado</i> : <span className="chat__texto">{m.texto}</span>}
                <span className="chat__hora">{hora(m.created_at)}</span>
              </div>
              {!m.oculto && (
                <div className="chat__acciones">
                  {cuenta.map((x) => (
                    <button key={x.e} type="button" className={`chat__reac${x.mia ? " is-mia" : ""}`} onClick={() => accion(() => reaccionar(m.id, x.e))}>
                      {x.e} {x.n}
                    </button>
                  ))}
                  <button type="button" className="chat__mini" aria-label="Reaccionar" onClick={() => setSelector(selector === m.id ? null : m.id)}>
                    ☺︎+
                  </button>
                  <button type="button" className="chat__mini" aria-label="Más opciones" onClick={() => setMenu(menu === m.id ? null : m.id)}>
                    ⋯
                  </button>
                  {selector === m.id && (
                    <span className="chat__selector">
                      {EMOJIS.map((e) => (
                        <button key={e} type="button" onClick={() => accion(() => reaccionar(m.id, e))}>
                          {e}
                        </button>
                      ))}
                    </span>
                  )}
                  {menu === m.id && (
                    <span className="chat__menu">
                      {(mio || moderador) && (
                        <button type="button" onClick={() => accion(() => borrarMensaje(m.id))}>
                          🗑 Borrar
                        </button>
                      )}
                      {!mio && (
                        <button type="button" onClick={() => accion(() => reportarMensaje(m.id), "Gracias: lo revisamos. Con varios reportes se oculta solo.")}>
                          🚩 Reportar
                        </button>
                      )}
                      {!mio && m.user_id && (
                        <button
                          type="button"
                          onClick={() =>
                            accion(async () => {
                              const r = await silenciar(m.user_id!, true);
                              if (r.ok) setSilenciados((s) => [...s, m.user_id!]);
                              return r;
                            }, `Has silenciado a ${m.autor ?? "esta persona"}: ya no verás sus mensajes.`)
                          }
                        >
                          🔇 Silenciar a {m.autor ?? "esta persona"}
                        </button>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, MAX_TEXTO))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void enviar();
            }
          }}
          rows={1}
          placeholder="Escribe a tu liga…"
          aria-label="Mensaje"
        />
        <button type="submit" className="btn btn--accent" disabled={enviando || !texto.trim()}>
          {enviando ? "…" : "Enviar"}
        </button>
      </form>
      {error && <p className="chat__aviso">{error}</p>}
      {silenciados.length > 0 && (
        <p className="chat__silenciados">
          Silenciados:{" "}
          {silenciados.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() =>
                accion(async () => {
                  const r = await silenciar(id, false);
                  if (r.ok) setSilenciados((s) => s.filter((x) => x !== id));
                  return r;
                })
              }
            >
              {nombres.get(id) ?? "alguien"} ✕
            </button>
          ))}
        </p>
      )}
      <p className="chat__normas">Respeto ante todo: los mensajes ofensivos se pueden reportar y se ocultan.</p>
    </div>
  );
}
