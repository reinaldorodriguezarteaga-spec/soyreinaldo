import type { Metadata } from "next";
import { Saira_Condensed, Archivo, Space_Mono } from "next/font/google";
import Header, { type FavoriteNavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import Gestures from "@/components/Gestures";
import { createClient } from "@/lib/supabase/server";
import { getCompetitionFixturesWindow, isLive } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import "./globals.css";

const saira = Saira_Condensed({
  variable: "--font-saira",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soy Reinaldo — Fútbol con Reinaldo",
  description:
    "Web personal de Reinaldo Rodríguez (@SoyReinaldoR) — creador de contenido culé. Quiniela del Mundial, media kit, redes y bot de comentarios.",
  metadataBase: new URL("https://soyreinaldo.com"),
  applicationName: "Soy Reinaldo",
  appleWebApp: {
    capable: true,
    title: "SoyReinaldo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0a1030",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ¿Hay algún partido EN JUEGO en alguna competición activa? (para el
  // indicador del header). Cada ventana va cacheada (unstable_cache) → coste
  // ~0 aunque se consulten varias competiciones en paralelo.
  let hasLiveMatch = false;
  try {
    const windows = await Promise.all(
      COMPETITIONS.map((c) => getCompetitionFixturesWindow(c)),
    );
    hasLiveMatch = windows.some((w) => w.some(isLive));
  } catch {
    // best-effort: no romper el layout si la API falla
  }

  // Favoritos del usuario para el desplegable del header — solo si hay sesión.
  let favorites: FavoriteNavItem[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_favorites")
      .select("kind, label, link_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    favorites = (data ?? []).map((row) => ({
      kind: row.kind as "competition" | "team",
      label: row.label,
      linkPath: row.link_path,
    }));
  }

  return (
    <html
      lang="es"
      className={`${saira.variable} ${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header initialUser={user} hasLiveMatch={hasLiveMatch} favorites={favorites} />
        <Gestures />
        <BackButton />
        {children}
        <Footer />
      </body>
    </html>
  );
}
