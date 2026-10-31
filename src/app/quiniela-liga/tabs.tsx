"use client";
import { MessageCircle, Swords } from "lucide-react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ScrollHintTabs from "@/components/ScrollHintTabs";
import type { ClubLeague } from "@/lib/quiniela-liga/league-utils";

// "Duelos" (18-oct, pedido del dueño): acceso directo a la vista de duelos
// de la clasificación (`?vista=duelos`), con su propia pestaña.
const TABS: { href: string; label: string; icono?: import("lucide-react").LucideIcon; vista?: string }[] = [
  { href: "/quiniela-liga/partidos", label: "Pronósticos" },
  { href: "/quiniela-liga/ranking", label: "Clasificación" },
  { href: "/quiniela-liga/chat", label: "Chat", icono: MessageCircle },
  { href: "/quiniela-liga/selecciones", label: "Selecciones" },
  { href: "/quiniela-liga/ranking", label: "Duelos", icono: Swords, vista: "duelos" },
  { href: "/quiniela-liga/picks", label: "Especiales" },
  { href: "/quiniela-liga/reglas", label: "Reglas" },
];

/**
 * Pestañas del hub. La liga elegida viaja en `?liga=` para no perderla al
 * cambiar de pestaña, y a quien manda en esa liga le sale "Gestión" al final
 * del renglón.
 */
export default function QuinielaLigaTabs({ leagues }: { leagues: ClubLeague[] }) {
  const pathname = usePathname();
  const params = useSearchParams();

  // En la portada se elige quiniela; las pestañas aún no vienen a cuento.
  if (pathname === "/quiniela-liga") return null;

  const wanted = params.get("liga")?.toLowerCase();
  // Mismo criterio que `pickLeague`, repetido aquí porque aquel módulo es de
  // servidor y este componente corre en el navegador.
  const active =
    (wanted
      ? leagues.find(
          (l) => l.code.toLowerCase() === wanted || l.id.toLowerCase() === wanted,
        )
      : null) ??
    leagues[0] ??
    null;

  const liga = active && !active.isPublic ? active.id : null;
  const vistaActual = params.get("vista");
  const hrefDe = (t: (typeof TABS)[number]) => {
    const q = new URLSearchParams();
    if (liga) q.set("liga", liga);
    if (t.vista) q.set("vista", t.vista);
    const s = q.toString();
    return s ? `${t.href}?${s}` : t.href;
  };

  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <nav aria-label="Secciones de los pronósticos" className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <ScrollHintTabs maxWidth={720}>
          {TABS.map((t) => {
            const enRuta = pathname === t.href || pathname.startsWith(`${t.href}/`);
            // Clasificación y Duelos comparten ruta: decide `?vista=`.
            const on = enRuta && (t.vista ? vistaActual === t.vista : vistaActual !== "duelos");
            return (
              <Link key={t.label} href={hrefDe(t)} className={on ? "on" : ""}>
                {t.icono && <t.icono className="ico-txt" aria-hidden />} {t.label}
              </Link>
            );
          })}
          {active?.role === "admin" && (
            <Link
              href={`/quiniela-liga/liga/${encodeURIComponent(active.id)}`}
              className={pathname.startsWith("/quiniela-liga/liga/") ? "on" : ""}
            >
              Gestión
            </Link>
          )}
        </ScrollHintTabs>
      </nav>
    </div>
  );
}
