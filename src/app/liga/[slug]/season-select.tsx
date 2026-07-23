"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

/**
 * Selector de temporada reutilizado en /liga/[slug] y /liga/[slug]/bracket:
 * navega vía `router.push` cambiando SOLO `season` en la query, preservando
 * cualquier otro param (`v`, etc.) ya presente. `currentSeason` es la season
 * "por defecto" de la `Competition` (`competition.season`, no la seleccionada
 * — la seleccionada se deriva del propio searchParam `season`); se usa para
 * la etiqueta "(actual)" y para quitar el param cuando el usuario vuelve a
 * ella (URL más limpia).
 */
export default function SeasonSelect({
  currentSeason,
  archivedSeasons,
  competitionSlug,
}: {
  currentSeason: number;
  archivedSeasons: number[];
  competitionSlug: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (archivedSeasons.length === 0) return null;

  const allSeasons = [currentSeason, ...archivedSeasons];
  const rawParam = searchParams.get("season");
  const rawNum = rawParam ? Number(rawParam) : NaN;
  const selected = allSeasons.includes(rawNum) ? rawNum : currentSeason;

  function seasonLabel(season: number): string {
    const short = `${season}-${String(season + 1).slice(2)}`;
    return season === currentSeason
      ? `${short} (actual)`
      : `${short} (temporada anterior)`;
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = Number(e.target.value);
    const params = new URLSearchParams(searchParams.toString());
    if (next === currentSeason) {
      params.delete("season");
    } else {
      params.set("season", String(next));
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  return (
    <label
      className="mono"
      htmlFor={`season-select-${competitionSlug}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 6,
        fontSize: "0.6rem",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--text-dim)",
      }}
    >
      Temporada
      <select
        id={`season-select-${competitionSlug}`}
        className="field"
        value={selected}
        onChange={onChange}
      >
        {allSeasons.map((s) => (
          <option key={s} value={s}>
            {seasonLabel(s)}
          </option>
        ))}
      </select>
    </label>
  );
}
