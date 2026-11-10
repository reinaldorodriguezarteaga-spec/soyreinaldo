"use client";

import { useCallback, useEffect, useState } from "react";
import type { Nivel } from "@/lib/juegos/niveles";

/**
 * Lo que repiten los juegos con reto del día y práctica: el estado del día
 * guardado en el navegador (para que recargar no reinicie el reloj ni deje
 * rejugar) y el nivel, el inicio y el fin de la partida en curso.
 *
 * `T` es lo propio de cada juego (intentos, letras…). En práctica no se
 * guarda nada.
 */
export type DiaGuardado<T> = { datos: T; nivel?: Nivel; inicio?: number; fin?: number };

function leer<T>(clave: string): Record<number, DiaGuardado<T>> {
  try {
    const g = JSON.parse(localStorage.getItem(clave) ?? "null") as { dias?: Record<number, DiaGuardado<T>> } | null;
    return g?.dias && typeof g.dias === "object" ? g.dias : {};
  } catch {
    return {};
  }
}

export function usePartidaDiaria<T>(clave: string, numero: number, vacio: T) {
  const [modo, setModo] = useState<"dia" | "practica">("dia");
  const [datos, setDatos] = useState<T>(vacio);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [inicio, setInicio] = useState<number | null>(null);
  const [fin, setFin] = useState<number | null>(null);
  const [dias, setDias] = useState<Record<number, DiaGuardado<T>>>({});

  // El reto de hoy, si ya se empezó en este navegador.
  useEffect(() => {
    const d = leer<T>(clave);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única al montar, no cascada
    setDias(d);
    const hoy = d[numero];
    if (hoy) {
      setDatos(hoy.datos ?? vacio);
      setNivel(hoy.nivel ?? null);
      setInicio(hoy.inicio ?? null);
      setFin(hoy.fin ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `vacio` es fijo por juego
  }, [clave, numero]);

  /** Guarda el día (solo en el reto del día). */
  const apuntar = useCallback(
    (parcial: Partial<DiaGuardado<T>>) => {
      if (modo !== "dia") return;
      setDias((prev) => {
        const previo: DiaGuardado<T> = prev[numero] ?? { datos: vacio };
        const nuevo = { ...prev, [numero]: { ...previo, ...parcial } };
        try {
          localStorage.setItem(clave, JSON.stringify({ dias: nuevo }));
        } catch {
          // Storage bloqueado: se juega igual, sin recordar el resultado.
        }
        return nuevo;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `vacio` es fijo por juego
    [modo, numero, clave],
  );

  const cambiarDatos = useCallback(
    (d: T, acaba = false) => {
      setDatos(d);
      const ahora = Date.now();
      if (acaba) setFin(ahora);
      apuntar({ datos: d, ...(acaba ? { fin: ahora } : {}) });
    },
    [apuntar],
  );

  const empezar = useCallback(
    (n: Nivel) => {
      const ahora = Date.now();
      setNivel(n);
      setInicio(ahora);
      setFin(null);
      apuntar({ nivel: n, inicio: ahora });
    },
    [apuntar],
  );

  const terminar = useCallback(() => {
    const ahora = Date.now();
    setFin(ahora);
    apuntar({ fin: ahora });
  }, [apuntar]);

  /** Partida nueva de práctica: mismo nivel, reloj desde cero. */
  const reiniciar = useCallback(() => {
    setDatos(vacio);
    setInicio(nivel ? Date.now() : null);
    setFin(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `vacio` es fijo por juego
  }, [nivel]);

  /** Cambia entre reto del día y práctica, recuperando el día guardado. */
  const irA = useCallback(
    (m: "dia" | "practica") => {
      setModo(m);
      if (m === "dia") {
        const hoy = dias[numero];
        setDatos(hoy?.datos ?? vacio);
        setNivel(hoy?.nivel ?? null);
        setInicio(hoy?.inicio ?? null);
        setFin(hoy?.fin ?? null);
      } else {
        setDatos(vacio);
        setInicio(nivel ? Date.now() : null);
        setFin(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `vacio` es fijo por juego
    [dias, numero, nivel],
  );

  return { modo, irA, datos, cambiarDatos, nivel, inicio, fin, empezar, terminar, reiniciar };
}
