"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleCompetitionFavorite,
  toggleTeamFavorite,
  togglePlayerFavorite,
  type FavoriteState,
} from "@/app/actions/favorites";

type CompetitionTarget = { kind: "competition"; slug: string; name: string };
type TeamTarget = {
  kind: "team";
  id: number;
  name: string;
  homeCompetitionSlug: string;
};
type PlayerTarget = {
  kind: "player";
  id: number;
  name: string;
  competitionSlug: string;
};

/** Botón de favorito (★/☆) para una competición, un equipo o un jugador. */
export default function FavoriteStar({
  target,
  initialFavorited,
}: {
  target: CompetitionTarget | TeamTarget | PlayerTarget;
  initialFavorited: boolean;
}) {
  const router = useRouter();

  async function action(_prev: FavoriteState): Promise<FavoriteState> {
    let result: FavoriteState;
    if (target.kind === "competition") {
      result = await toggleCompetitionFavorite({
        slug: target.slug,
        name: target.name,
      });
    } else if (target.kind === "team") {
      result = await toggleTeamFavorite({
        id: target.id,
        name: target.name,
        homeCompetitionSlug: target.homeCompetitionSlug,
      });
    } else {
      result = await togglePlayerFavorite({
        id: target.id,
        name: target.name,
        competitionSlug: target.competitionSlug,
      });
    }

    // Sin sesión: mandamos a iniciar sesión en vez de fallar en silencio.
    if (result.needsLogin) {
      router.push("/login");
      return _prev;
    }
    return result;
  }

  const [state, formAction, pending] = useActionState<FavoriteState>(action, {
    status: "idle",
    favorited: initialFavorited,
  });

  const favorited = state.favorited ?? initialFavorited;
  const label = favorited
    ? `Quitar ${target.name} de favoritos`
    : `Añadir ${target.name} a favoritos`;

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        className="grid h-10 w-10 place-items-center rounded-[4px] border border-[var(--line-strong)] transition"
        style={{ color: favorited ? "var(--accent)" : "var(--text-dim)" }}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill={favorited ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            strokeLinejoin="round"
            d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.8 7.1-.7z"
          />
        </svg>
      </button>
    </form>
  );
}
