import type { Estado, PorLado, Punto } from "./estado";
import { huecos, type Lado } from "./formaciones";
import { nombreCorto } from "@/lib/sports/nombres";

type Jugador = { id: number; name: string; number: number | null };
export type FichaVistaPrevia = Punto & {
  lado: Lado;
  indice: number;
  color: string;
  dorsal: number | null;
  apellido: string;
};

/** Solo los huecos con jugador (los vacíos no se pintan). Las coordenadas
 * se mantienen canónicas: x es el largo, y el ancho. */
export function fichasVistaPrevia(estado: Estado, plantillas: PorLado<Jugador[]>): FichaVistaPrevia[] {
  return (["local", "visitante"] as const).flatMap((lado) => {
    const jugadores = new Map(plantillas[lado].map((j) => [j.id, j]));
    return huecos(estado.formacion[lado], lado).flatMap((h, indice) => {
      const id = estado.once[lado][indice];
      if (id == null) return [];
      const jugador = jugadores.get(id);
      const punto = estado.movidos[`${lado}:${indice}`] ?? h;
      return [
        {
          x: punto.x,
          y: punto.y,
          lado,
          indice,
          color: estado.colores[lado],
          dorsal: jugador?.number ?? null,
          apellido: jugador ? nombreCorto(jugador.name) : "",
        },
      ];
    });
  });
}
