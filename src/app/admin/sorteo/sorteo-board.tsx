"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

/** Equipo del pool del buscador (equipos-pool.json) o de un hueco relleno. */
export type PoolTeam = { id: number; name: string; logo: string };

const SLOTS = 4;
const STORAGE_KEY = "admin-sorteo-ucl-2026";

type Side = "home" | "away";
type CardState = { home: (PoolTeam | null)[]; away: (PoolTeam | null)[] };
type BoardState = Record<number, CardState>;

function emptyCard(): CardState {
  return { home: Array(SLOTS).fill(null), away: Array(SLOTS).fill(null) };
}

/** "Múnich" → "munich": el filtro ignora acentos en ambos lados. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Válvula de escape para el directo: si un equipo no está en el pool, se
 * añade tal cual con un id negativo (jamás colisiona con ids reales de la
 * API) y sin escudo.
 */
function customTeam(name: string): PoolTeam {
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)!) | 0;
  return { id: -(Math.abs(h) + 1), name, logo: "" };
}

/** Escudo del equipo, o un círculo con la inicial si no tiene (equipo manual). */
function TeamBadge({ team, size }: { team: PoolTeam; size: number }) {
  if (!team.logo)
    return (
      <span
        style={{ width: size, height: size }}
        className="flex shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[10px] font-bold text-zinc-300"
      >
        {team.name.charAt(0).toUpperCase()}
      </span>
    );
  return <Image src={team.logo} alt="" width={size} height={size} unoptimized />;
}

export default function SorteoBoard({
  potTeams,
  pool,
}: {
  potTeams: PoolTeam[];
  pool: PoolTeam[];
}) {
  const [board, setBoard] = useState<BoardState>({});
  const [hydrated, setHydrated] = useState(false);

  // Rehidrata desde localStorage al montar (sobrevive a recargas en directo).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
      if (raw) setBoard(JSON.parse(raw) as BoardState);
    } catch {
      // JSON corrupto o storage bloqueado: se empieza de cero.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      // Storage lleno/bloqueado: la página sigue funcionando sin persistir.
    }
  }, [board, hydrated]);

  const potById = useMemo(
    () => new Map(potTeams.map((t) => [t.id, t])),
    [potTeams],
  );

  const assign = (potId: number, side: Side, index: number, team: PoolTeam) =>
    setBoard((prev) => {
      const next = { ...prev };
      const card = next[potId] ?? emptyCard();
      const column = card[side].slice();
      column[index] = team;
      next[potId] = { ...card, [side]: column };

      // Espejo: si el rival también es del bombo 1, se le rellena el cruce
      // inverso (mi casa = su fuera) en su primer hueco libre — salvo que ya
      // lo tuviera puesto o no le quede sitio.
      const owner = potById.get(potId);
      if (owner && potById.has(team.id) && team.id !== potId) {
        const rivalCard = next[team.id] ?? emptyCard();
        const already = [...rivalCard.home, ...rivalCard.away].some(
          (t) => t?.id === potId,
        );
        const oppSide: Side = side === "home" ? "away" : "home";
        const oppColumn = rivalCard[oppSide].slice();
        const free = oppColumn.findIndex((t) => !t);
        if (!already && free !== -1) {
          oppColumn[free] = owner;
          next[team.id] = { ...rivalCard, [oppSide]: oppColumn };
        }
      }
      return next;
    });

  const clearSlot = (potId: number, side: Side, index: number) =>
    setBoard((prev) => {
      const next = { ...prev };
      const card = next[potId] ?? emptyCard();
      const column = card[side].slice();
      const removed = column[index];
      column[index] = null;
      next[potId] = { ...card, [side]: column };

      // Espejo del borrado: quitar también este equipo de la columna
      // contraria del rival del bombo 1.
      if (removed && potById.has(removed.id)) {
        const rivalCard = next[removed.id];
        const oppSide: Side = side === "home" ? "away" : "home";
        const at = rivalCard?.[oppSide].findIndex((t) => t?.id === potId) ?? -1;
        if (rivalCard && at !== -1) {
          const oppColumn = rivalCard[oppSide].slice();
          oppColumn[at] = null;
          next[removed.id] = { ...rivalCard, [oppSide]: oppColumn };
        }
      }
      return next;
    });

  const clearAll = () => {
    if (!window.confirm("¿Borrar todos los emparejamientos?")) return;
    setBoard({});
  };

  const filled = Object.values(board).reduce(
    (n, c) => n + c.home.filter(Boolean).length + c.away.filter(Boolean).length,
    0,
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-500">
          {filled} de {potTeams.length * SLOTS * 2} rivales asignados
        </p>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-red-500/60 hover:text-red-400"
        >
          Limpiar todo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {potTeams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            card={board[team.id] ?? emptyCard()}
            pool={pool}
            onAssign={(side, i, rival) => assign(team.id, side, i, rival)}
            onClear={(side, i) => clearSlot(team.id, side, i)}
          />
        ))}
      </div>
    </div>
  );
}

function TeamCard({
  team,
  card,
  pool,
  onAssign,
  onClear,
}: {
  team: PoolTeam;
  card: CardState;
  pool: PoolTeam[];
  onAssign: (side: Side, index: number, rival: PoolTeam) => void;
  onClear: (side: Side, index: number) => void;
}) {
  // Un solo buscador activo por tarjeta: (lado, hueco) o null.
  const [active, setActive] = useState<{ side: Side; index: number } | null>(null);

  // Ids ya usados en esta tarjeta (el mismo rival no puede repetirse).
  const used = useMemo(() => {
    const s = new Set<number>([team.id]);
    for (const t of [...card.home, ...card.away]) if (t) s.add(t.id);
    return s;
  }, [team.id, card]);

  const count =
    card.home.filter(Boolean).length + card.away.filter(Boolean).length;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <header className="mb-4 flex flex-col items-center gap-2">
        <Image src={team.logo} alt="" width={48} height={48} unoptimized />
        <h2 className="text-center text-lg font-semibold tracking-tight">
          {team.name}
        </h2>
        <span
          className={`text-[11px] ${count === SLOTS * 2 ? "text-emerald-400" : "text-zinc-500"}`}
        >
          {count}/{SLOTS * 2} rivales
        </span>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {(["home", "away"] as const).map((side) => (
          <div key={side}>
            <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
              {side === "home" ? "🏠 En casa" : "✈️ Fuera"}
            </p>
            <div className="flex flex-col gap-1.5">
              {card[side].map((rival, i) =>
                rival ? (
                  <FilledSlot
                    key={i}
                    rival={rival}
                    onClear={() => onClear(side, i)}
                  />
                ) : active?.side === side && active.index === i ? (
                  <SlotSearch
                    key={i}
                    pool={pool}
                    used={used}
                    onPick={(t) => {
                      onAssign(side, i, t);
                      setActive(null);
                    }}
                    onCancel={() => setActive(null)}
                  />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActive({ side, index: i })}
                    className="flex h-9 items-center justify-center rounded-md border border-dashed border-zinc-800 text-xs text-zinc-600 transition hover:border-indigo-400/60 hover:text-indigo-300"
                  >
                    + Añadir
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FilledSlot({
  rival,
  onClear,
}: {
  rival: PoolTeam;
  onClear: () => void;
}) {
  return (
    <div className="group flex h-9 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950/60 px-2">
      <TeamBadge team={rival} size={20} />
      <span className="min-w-0 truncate text-xs font-medium">{rival.name}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Quitar ${rival.name}`}
        className="ml-auto hidden text-zinc-600 transition hover:text-red-400 group-hover:block"
      >
        ×
      </button>
    </div>
  );
}

function SlotSearch({
  pool,
  used,
  onPick,
  onCancel,
}: {
  pool: PoolTeam[];
  used: Set<number>;
  onPick: (t: PoolTeam) => void;
  onCancel: () => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const term = fold(q.trim());
  const hits = useMemo(() => {
    if (term.length < 2) return [];
    return pool.filter((t) => fold(t.name).includes(term)).slice(0, 8);
  }, [pool, term]);
  const firstFree = hits.find((t) => !used.has(t.id));

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
          if (e.key === "Enter") {
            if (firstFree) onPick(firstFree);
            // Sin resultados → Enter añade el texto tal cual (equipo manual).
            else if (hits.length === 0 && term.length >= 2)
              onPick(customTeam(q.trim()));
          }
        }}
        onBlur={() => {
          // Deja pasar el click de la lista (onMouseDown) antes de cerrar.
          setTimeout(onCancel, 150);
        }}
        placeholder="Equipo…"
        className="h-9 w-full rounded-md border border-indigo-400/60 bg-zinc-950 px-2 text-xs text-white outline-none placeholder:text-zinc-600"
      />
      {term.length >= 2 && (
        <ul className="absolute left-0 right-0 top-10 z-20 max-h-64 overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-xl">
          {hits.length === 0 ? (
            <li>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(customTeam(q.trim()));
                }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-indigo-500/15"
              >
                <span className="text-zinc-500">＋</span>
                <span className="min-w-0 truncate">
                  Añadir “{q.trim()}” tal cual
                </span>
              </button>
            </li>
          ) : (
            hits.map((t) => {
              const taken = used.has(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={taken}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (!taken) onPick(t);
                    }}
                    className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs ${
                      taken
                        ? "cursor-not-allowed text-zinc-600"
                        : "text-zinc-200 hover:bg-indigo-500/15"
                    }`}
                  >
                    <TeamBadge team={t} size={18} />
                    <span className="min-w-0 truncate">{t.name}</span>
                    {taken && (
                      <span className="ml-auto text-[10px] text-zinc-600">
                        ya elegido
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
