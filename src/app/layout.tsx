import type { Metadata } from "next";
import Script from "next/script";
import { Saira_Condensed, Archivo, Space_Mono } from "next/font/google";
import Header, { type FavoriteNavItem } from "@/components/Header";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import Gestures from "@/components/Gestures";
import CookieConsent from "@/components/CookieConsent";
import InstallBanner from "@/components/InstallBanner";
import PuenteAvisosApp from "@/components/PuenteAvisosApp";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { createClient } from "@/lib/supabase/server";
import { isAppRequest } from "@/lib/is-app";
import { getCompetitionFixturesWindow, isLive } from "@/lib/sports/api-football";
import { COMPETITIONS } from "@/lib/sports/competitions";
import "./globals.css";
import SelectorFavoritos from "@/components/SelectorFavoritos";
import { hayPartidoEnJuego } from "@/lib/sports/directo";
import DirectoReinaldo from "@/components/DirectoReinaldo";
import { EnAppProvider } from "@/components/EnApp";
import Actividad from "@/components/Actividad";

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
    "Fútbol en directo con Reinaldo Rodríguez (@SoyReinaldoR): marcadores, calendario y clasificaciones de LaLiga, Champions, Premier, Serie A y Ligue 1, más quiniela gratis y análisis propios.",
  // La web vive en www — el ápice redirige. Con el ápice aquí, cada canónica
  // y cada URL de OpenGraph apuntaba a una dirección que rebota.
  metadataBase: new URL("https://www.soyreinaldo.com"),
  applicationName: "Soy Reinaldo",
  appleWebApp: {
    capable: true,
    title: "SoyReinaldo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  // Verificación de propiedad de AdSense (método "Etiqueta meta") — señal
  // extra además del script y de /ads.txt, por si el rastreador tropieza
  // con la redirección apex→www al verificar.
  other: ADSENSE_CLIENT_ID
    ? { "google-adsense-account": ADSENSE_CLIENT_ID }
    : {},
};

export const viewport = {
  themeColor: "#0a1030",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // El indicador del directo llega de forma independiente: si el cron falla,
  // sus consultas de respaldo no bloquean todas las páginas de la web.
  const hasLiveMatch = hayPartidoEnJuego().then((vivo) =>
    vivo != null
      ? vivo
      : Promise.all(COMPETITIONS.map((c) => getCompetitionFixturesWindow(c)))
          .then((windows) => windows.some((w) => w.some(isLive)))
          .catch(() => false),
  ).catch(() => false);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dentro de la app nativa: sin anuncios (AdSense no se permite dentro de
  // una app y Apple exigiría el permiso de rastreo), y por tanto sin banner
  // de cookies; sin la franja de "instalar la web como app", que dentro de
  // la app no tiene sentido (App Store, 14-oct-2026).
  const inApp = await isAppRequest();
  const anuncios = !!ADSENSE_CLIENT_ID && !inApp;

  // Perfil y favoritos en paralelo; el indicador del directo se resuelve
  // aparte, dentro de las pastillas de la cabecera.
  const [perfilRes, favoritosRes] = await Promise.all([
    user
      ? supabase.from("profiles").select("is_admin, favoritos_elegidos_at, permisos").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from("user_favorites")
          .select("kind, label, link_path")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
  ]);
  const profile = perfilRes.data as {
    is_admin: boolean | null;
    favoritos_elegidos_at: string | null;
    permisos: string[] | null;
  } | null;
  // Para el atajo "Admin" en el menú de usuario — evita que quien no sea
  // admin vea enlaces a páginas que igualmente le rechazaría /admin/layout.tsx.
  const isAdmin = !!profile?.is_admin;
  // Permisos por sección (migración 087): sus atajos en el menú de usuario.
  const permisos = isAdmin ? [] : (profile?.permisos ?? []);
  // ¿Le falta pasar por el selector de favoritos? (migración 067)
  const pedirFavoritos = !!profile && !profile.favoritos_elegidos_at;
  // Favoritos del usuario para el desplegable del header.
  const favorites: FavoriteNavItem[] = (
    (favoritosRes.data ?? []) as { kind: string; label: string; link_path: string }[]
  ).map((row) => ({
    kind: row.kind as "competition" | "team",
    label: row.label,
    linkPath: row.link_path,
  }));

  return (
    <html
      lang="es"
      className={`${saira.variable} ${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {anuncios && (
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
        <EnAppProvider enApp={inApp}>
        <Header
          initialUser={user}
          hasLiveMatch={hasLiveMatch}
          favorites={favorites}
          isAdmin={isAdmin}
          permisos={permisos}
        />
        {/* En flujo normal, no fixed: aparece bajo el header sticky al
            cargar y se va con el scroll como cualquier otro contenido —
            nada compite con el banner de cookies, que sí es fixed abajo. */}
        {!inApp && <InstallBanner />}
        <DirectoReinaldo />
        {user && <Actividad />}
        {/* App 1.1: abrir el partido al tocar un aviso y refrescar el token. */}
        {inApp && <PuenteAvisosApp conSesion={!!user} />}
        {pedirFavoritos && (
          <SelectorFavoritos
            ligas={COMPETITIONS.map((c) => ({
              slug: c.slug,
              name: c.name,
              leagueId: c.leagueId,
              region: c.region,
            }))}
          />
        )}
        <Gestures />
        <BackButton />
        {children}
        <Footer />
        </EnAppProvider>
        {anuncios && <CookieConsent />}
        {/* Vercel Web Analytics: visitas y páginas vistas sin cookies ni
            huella de usuario, así que no depende del banner de consentimiento.
            Hay que tenerlo activado además en el panel de Vercel. */}
        <Analytics />
        {/* Speed Insights: mide en el navegador de cada visitante las Core Web
            Vitals reales (LCP, INP, CLS). Como Analytics, va sin cookies y hay
            que activarlo aparte en el panel de Vercel. */}
        <SpeedInsights />
      </body>
    </html>
  );
}

