"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Pestañas del hub de la quiniela de LaLiga. */
const TABS = [
  { href: "/quiniela-liga/partidos", label: "Pronósticos" },
  { href: "/quiniela-liga/ranking", label: "Clasificación" },
  { href: "/quiniela-liga/picks", label: "Especiales" },
];

export default function QuinielaLigaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <>
      <div className="wrap" style={{ paddingTop: 18 }}>
        <nav aria-label="Secciones de la quiniela" className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
          <div className="tabs tabs--scroll" style={{ maxWidth: 520 }}>
            {TABS.map((t) => {
              const active =
                pathname === t.href || pathname.startsWith(`${t.href}/`);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={active ? "on" : ""}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      {children}
    </>
  );
}
