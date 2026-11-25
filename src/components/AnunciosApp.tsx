"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  BLOQUES,
  EN_PRUEBAS,
  admitePantallaCompleta,
  admobNativo,
  plataformaAnuncios,
  type PluginAdMob,
} from "@/lib/anuncios-app";

/**
 * Anuncios de AdMob dentro de la app (25-nov-2026, plan de monetización del
 * 17-oct). Solo hace algo si la app trae el plugin de AdMob (1.3 en
 * adelante); en la web y en las apps viejas no pinta nada.
 *
 * - Al abrir: aviso de consentimiento de Google (RGPD, solo en el EEE/UK/CH)
 *   y, en iPhone, el aviso de Apple de seguimiento (ATT). Sin permiso se ven
 *   anuncios igual, menos personalizados.
 * - Banner fijo abajo del todo. La barra de pestañas sube lo que mide el
 *   banner (--banner-alto, ver globals.css).
 * - Pantalla completa de vez en cuando al cambiar de página: no antes de
 *   2 min de uso, cada 6 cambios de página como mucho y con 4 min entre uno
 *   y otro. Nunca mientras se juega (ver `admitePantallaCompleta`).
 */

const ESPERA_INICIAL_MS = 2 * 60 * 1000;
const ENTRE_PANTALLAS_MS = 4 * 60 * 1000;
const CADA_N_PAGINAS = 6;

export default function AnunciosApp() {
  const ruta = usePathname();
  const listo = useRef<PluginAdMob | null>(null);
  const preparada = useRef(false);
  const paginas = useRef(0);
  const inicio = useRef(0);
  const ultima = useRef(0);

  useEffect(() => {
    const admob = admobNativo();
    if (!admob) return;
    let vivo = true;
    let escucha: { remove: () => Promise<void> } | null = null;
    const bloques = BLOQUES[plataformaAnuncios()];
    inicio.current = Date.now();

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
          adId: bloques.banner,
          adSize: "ADAPTIVE_BANNER",
          position: "BOTTOM_CENTER",
          margin: 0,
          isTesting: EN_PRUEBAS,
        });
        listo.current = admob;
        await admob.prepareInterstitial({ adId: bloques.pantallaCompleta, isTesting: EN_PRUEBAS });
        preparada.current = true;
      } catch {
        // Sin anuncios (sin conexión, sin relleno, cuenta aún sin aprobar…):
        // la app sigue igual.
      }
    })();

    return () => {
      vivo = false;
      void escucha?.remove();
    };
  }, []);

  // Pantalla completa de vez en cuando al cambiar de página.
  useEffect(() => {
    const admob = listo.current;
    if (!admob) return;
    paginas.current += 1;
    const ahora = Date.now();
    if (
      !preparada.current ||
      paginas.current % CADA_N_PAGINAS !== 0 ||
      ahora - inicio.current < ESPERA_INICIAL_MS ||
      ahora - ultima.current < ENTRE_PANTALLAS_MS ||
      !admitePantallaCompleta(ruta)
    ) {
      return;
    }
    preparada.current = false;
    ultima.current = ahora;
    const bloque = BLOQUES[plataformaAnuncios()].pantallaCompleta;
    admob
      .showInterstitial()
      .catch(() => {})
      .finally(() => {
        admob
          .prepareInterstitial({ adId: bloque, isTesting: EN_PRUEBAS })
          .then(() => {
            preparada.current = true;
          })
          .catch(() => {});
      });
  }, [ruta]);

  return null;
}
