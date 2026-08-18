import type { Metadata } from "next";
import Script from "next/script";
import { Saira_Condensed, Archivo, Space_Mono } from "next/font/google";
import Header, { type FavoriteNavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import Gestures from "@/components/Gestures";
import CookieConsent from "@/components/CookieConsent";
import { createClient } from "@/lib/supabase/server";
import { getCompetitionFixturesWindow, isLive } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import "./globals.css";

/**
 * Google AdSense (Auto Ads) — monetización del sitio. Todo queda apagado
 * (cero scripts de Google, cero banner de cookies) hasta que exista
 * NEXT_PUBLIC_ADSENSE_CLIENT_ID en el entorno (ver .env.local.example). En
 * cuanto se configure, Google inserta anuncios automáticamente por todo el
 * sitio — hace falta ADEMÁS activar "Auto ads" para este sitio en el panel
 * de AdSense (dashboard → Anuncios → Por sitio), esto solo carga el script.
 */
const ADSENSE_CLIENT_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

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

  // Para el atajo "Admin" en el menú de usuario — evita que quien no sea
  // admin vea enlaces a páginas que igualmente le rechazaría /admin/layout.tsx.
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = !!profile?.is_admin;
  }

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
        {ADSENSE_CLIENT_ID && (
          <>
            {/* Consent Mode v2: todo denegado por defecto, ANTES de que
                cargue cualquier script de Google — RGPD/ePrivacy.
                CookieConsent.tsx actualiza esto ("consent","update",...)
                cuando el usuario elige. strategy="beforeInteractive": Next
                lo inyecta en el <head> del HTML inicial pase donde pase este
                componente en el árbol — tiene que ganarle la carrera al
                script de abajo. */}
            <Script id="consent-default" strategy="beforeInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){ dataLayer.push(arguments); }
                gtag('consent', 'default', {
                  ad_storage: 'denied',
                  ad_user_data: 'denied',
                  ad_personalization: 'denied',
                  analytics_storage: 'denied',
                  wait_for_update: 500
                });
              `}
            </Script>
            <Script
              id="adsbygoogle-init"
              async
              strategy="beforeInteractive"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
              crossOrigin="anonymous"
            />
          </>
        )}
        <Header
          initialUser={user}
          hasLiveMatch={hasLiveMatch}
          favorites={favorites}
          isAdmin={isAdmin}
        />
        <Gestures />
        <BackButton />
        {children}
        <Footer />
        {ADSENSE_CLIENT_ID && <CookieConsent />}
      </body>
    </html>
  );
}
