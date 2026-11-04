import { redirect } from "next/navigation";
import { slugParaJugador } from "@/lib/sports/search-links";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";

/**
 * Entrada global a la ficha de un jugador: /jugador/[id] averigua en qué
 * competición nuestra juega y redirige a /liga/[slug]/jugador/[id].
 *
 * Existe por la búsqueda universal: encuentra jugadores de cualquier liga del
 * mundo, y la ficha necesita una competición. Resolverlo aquí (al hacer clic)
 * y no en la lista de resultados ahorra una llamada por resultado mostrado.
 */
export default async function JugadorRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pid = Number(id);
  if (!Number.isFinite(pid) || pid <= 0) redirect("/buscar");
  // Un clic más en el buscador: ordena los resultados y «Los más buscados».
  try {
    await clienteServicio()?.rpc("jugador_buscado", { p_id: pid });
  } catch {
    // Que no contar nunca impida abrir la ficha.
  }
  redirect(`/liga/${await slugParaJugador(pid)}/jugador/${pid}`);
}
