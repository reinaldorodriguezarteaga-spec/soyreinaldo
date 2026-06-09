"use client";

import { useState } from "react";
import { joinLeagueByCode } from "./actions";

type Props = {
  league: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
  };
};

/**
 * Card de liga privada: muestra nombre + badge "Privada" + botón.
 * Al pulsar el botón, el botón se reemplaza por un input para el código y
 * un botón "Entrar". Se hace submit a `joinLeagueByCode`, que si el código
 * es correcto une al usuario y redirige al ranking.
 */
export default function PrivateLeagueCard({ league }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <article className="leaguerow">
      <div className="leaguerow__main">
        <h3 className="leaguerow__name">
          {league.name}
          <span className="badge badge--danger">Privada</span>
        </h3>
        {league.description && (
          <p className="leaguerow__desc">{league.description}</p>
        )}
        <p className="leaguerow__meta">
          {league.memberCount}{" "}
          {league.memberCount === 1 ? "miembro" : "miembros"} ya dentro
        </p>
      </div>

      <div className="leaguerow__actions">
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn btn--ghost"
          >
            Unirme
          </button>
        ) : (
          <form
            action={joinLeagueByCode}
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              name="code"
              required
              minLength={4}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="characters"
              autoFocus
              placeholder="CÓDIGO"
              className="field"
              style={{
                marginBottom: 0,
                width: 160,
                fontFamily: "var(--font-mono-stack)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn--accent">
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mono"
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--text-dim)",
                  cursor: "pointer",
                }}
                title="Cancelar"
              >
                ✕
              </button>
            </div>
          </form>
        )}
      </div>
    </article>
  );
}
