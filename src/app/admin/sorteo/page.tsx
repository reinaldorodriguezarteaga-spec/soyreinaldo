import Link from "next/link";
import SorteoBoard, { type PoolTeam } from "./sorteo-board";
import pool from "./equipos-pool.json";

export const metadata = {
  title: "Sorteo Champions | Admin | Soy Reinaldo",
};

/**
 * Bombo 1 del sorteo de la fase de liga 2026-27. IDs verificados contra
 * `/teams?league=…&season=2026` de la API real (27-ago-2026).
 */
const BOMBO_1: PoolTeam[] = [
  { id: 529, name: "Barcelona", logo: logoUrl(529) },
  { id: 541, name: "Real Madrid", logo: logoUrl(541) },
  { id: 85, name: "PSG", logo: logoUrl(85) },
  { id: 40, name: "Liverpool", logo: logoUrl(40) },
  { id: 50, name: "Manchester City", logo: logoUrl(50) },
  { id: 505, name: "Inter", logo: logoUrl(505) },
  { id: 42, name: "Arsenal", logo: logoUrl(42) },
  { id: 157, name: "Bayern Múnich", logo: logoUrl(157) },
  { id: 530, name: "Atlético de Madrid", logo: logoUrl(530) },
];

function logoUrl(teamId: number): string {
  // Mismo patrón que devuelve la propia API en cada respuesta de /teams.
  return `https://media.api-sports.io/football/teams/${teamId}.png`;
}

export default function AdminSorteoPage() {
  // El pool del buscador es un JSON estático generado por
  // scripts/gen-sorteo-pool.mjs — NADA de llamadas a API-Football en runtime:
  // el día del sorteo esta página no puede depender de la cuota (pedir las
  // ~19 listas de golpe dispara el rate limit por minuto, verificado).
  return (
    <main className="flex flex-1 flex-col px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-7xl">
        <Link
          href="/admin/ligas"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Admin
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Admin · Directo
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Sorteo de la Champions 26-27
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Bombo 1 con sus 8 rivales: 4 en casa 🏠 y 4 fuera ✈️. Pulsa un
            hueco, escribe dos letras y elige al rival. Los cruces entre
            equipos del bombo 1 se rellenan solos en las dos tarjetas, y todo
            queda guardado en este navegador aunque recargues la página.
          </p>
        </header>

        <SorteoBoard potTeams={BOMBO_1} pool={pool} />
      </div>
    </main>
  );
}
