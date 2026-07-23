"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  toggleCompetitionFavorite,
  toggleTeamFavorite,
  type FavoriteState,
} from "@/app/actions/favorites";

type CompetitionTarget = { kind: "competition"; slug: string; name: string };
type TeamTarget = {
  kind: "team";
  id: number;
  name: string;
  homeCompetitionSlug: string;
};

/** Botón de favorito (★/☆) para una competición o un equipo. */
export default function FavoriteStar({
  target,
  initialFavorited,
}: {
  target: CompetitionTarget | TeamTarget;
  initialFavorited: boolean;
}) {
  const router = useRouter();

  async function action(_prev: FavoriteState): Promise<FavoriteState> {
    const result =
      target.kind === "competition"
        ? await toggleCompetitionFavorite({ slug: target.slug, name: target.name })
        : await toggleTeamFavorite({
            id: target.id,
            name: target.name,
            homeCompetitionSlug: target.homeCompetitionSlug,
          });

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
