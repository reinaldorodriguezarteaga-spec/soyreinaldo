"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ScrollHintTabs from "@/components/ScrollHintTabs";

/** Pestañas del hub de la quiniela de clubes. */
const TABS = [
  { href: "/quiniela-liga/partidos", label: "Pronósticos" },
  { href: "/quiniela-liga/ranking", label: "Clasificación" },
  { href: "/quiniela-liga/selecciones", label: "Selecciones" },
  { href: "/quiniela-liga/picks", label: "Especiales" },
  { href: "/quiniela-liga/reglas", label: "Reglas" },
];

function Tabs() {
  const pathname = usePathname();
  const params = useSearchParams();

  // En la portada se elige quiniela; las pestañas aún no vienen a cuento
  // (y para volver a elegir está "Quiniela" en la cabecera).
  if (pathname === "/quiniela-liga") return null;

  // La liga elegida viaja en la URL para no perderla al cambiar de pestaña.
  const liga = params.get("liga");
  const qs = liga ? `?liga=${encodeURIComponent(liga)}` : "";

  return (
    <div className="wrap" style={{ paddingTop: 18 }}>
      <nav aria-label="Secciones de la quiniela" className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <ScrollHintTabs maxWidth={520}>
          {TABS.map((t) => {
            const active =
              pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <Link
                key={t.href}
                href={`${t.href}${qs}`}
                className={active ? "on" : ""}
              >
                {t.label}
              </Link>
            );
          })}
        </ScrollHintTabs>
      </nav>
    </div>
  );
}

export default function QuinielaLigaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <Tabs />
      </Suspense>
      {children}
    </>
  );
}
