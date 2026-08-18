"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import ScrollHintTabs from "@/components/ScrollHintTabs";
import type { ClubLeague } from "@/lib/quiniela-liga/leagues";

const TABS = [
  { href: "/quiniela-liga/partidos", label: "Pronósticos" },
  { href: "/quiniela-liga/ranking", label: "Clasificación" },
  { href: "/quiniela-liga/selecciones", label: "Selecciones" },
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

  const qs = active && !active.isPublic ? `?liga=${encodeURIComponent(active.id)}` : "";

  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <nav aria-label="Secciones de la quiniela" className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <ScrollHintTabs maxWidth={520}>
          {TABS.map((t) => {
            const on = pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <Link key={t.href} href={`${t.href}${qs}`} className={on ? "on" : ""}>
                {t.label}
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
