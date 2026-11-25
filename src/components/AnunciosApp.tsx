"use client";

import { useEffect } from "react";
import { BLOQUES, EN_PRUEBAS, admobNativo, plataformaAnuncios } from "@/lib/anuncios-app";

/**
 * Anuncios de AdMob dentro de la app (25-nov-2026, plan de monetización del
 * 17-oct). Solo hace algo si la app trae el plugin de AdMob (1.3 en
 * adelante); en la web y en las apps viejas no pinta nada. El admin no los
 * ve (lo decide `layout.tsx`).
 *
 * - Al abrir: aviso de consentimiento de Google (RGPD, solo en el EEE/UK/CH)
 *   y, en iPhone, el aviso de Apple de seguimiento (ATT). Sin permiso se ven
 *   anuncios igual, menos personalizados.
 * - Solo un banner fijo abajo del todo. La barra de pestañas sube lo que mide
 *   el banner (--banner-alto, ver globals.css).
 * - Sin anuncios a pantalla completa: el dueño los quitó el mismo día por
 *   invasivos («la gente se saldrá»). El bloque sigue creado en AdMob, sin uso.
 */
export default function AnunciosApp() {
  useEffect(() => {
    const admob = admobNativo();
    if (!admob) return;
    let vivo = true;
    let mostrado = false;
    let escucha: { remove: () => Promise<void> } | null = null;

    (async () => {
      try {
        await admob.initialize({ initializeForTesting: EN_PRUEBAS });
        let consentimiento = await admob.requestConsentInfo();
        if (consentimiento.status === "REQUIRED" && consentimiento.isConsentFormAvailable) {
          consentimiento = await admob.showConsentForm();
        }
        if (plataformaAnuncios() === "ios") {
          const { status } = await admob.trackingAuthorizationStatus();
          if (status === "notDetermined") await admob.requestTrackingAuthorization();
        }
        if (!vivo || !consentimiento.canRequestAds) return;

        escucha = await admob.addListener("bannerAdSizeChanged", (info) => {
          const alto = Math.max(0, Math.round(info.height ?? 0));
          document.documentElement.style.setProperty("--banner-alto", `${alto}px`);
        });
        await admob.showBanner({
          adId: BLOQUES[plataformaAnuncios()].banner,
          adSize: "ADAPTIVE_BANNER",
          position: "BOTTOM_CENTER",
          margin: 0,
          isTesting: EN_PRUEBAS,
        });
        mostrado = true;
        // Si se desmontó mientras cargaba (p. ej. entró el admin), fuera.
        if (!vivo) void admob.hideBanner().catch(() => {});
      } catch {
        // Sin anuncios (sin conexión, sin relleno, cuenta aún sin aprobar…):
        // la app sigue igual.
      }
    })();

    return () => {
      vivo = false;
      void escucha?.remove();
      if (mostrado) {
        void admob.hideBanner().catch(() => {});
        document.documentElement.style.setProperty("--banner-alto", "0px");
      }
    };
  }, []);

  return null;
}
