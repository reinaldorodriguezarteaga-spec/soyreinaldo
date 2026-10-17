"use client";

import { useEffect } from "react";
import { registrarActividad } from "@/app/actions/actividad";

/** Una vez al día por navegador: "este usuario ha estado hoy" (métricas). */
export default function Actividad() {
  useEffect(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem("actividad") === hoy) return;
      localStorage.setItem("actividad", hoy);
    } catch {
      // Sin almacenamiento: se registra igual (el servidor ignora repetidos).
    }
    registrarActividad();
  }, []);
  return null;
}
