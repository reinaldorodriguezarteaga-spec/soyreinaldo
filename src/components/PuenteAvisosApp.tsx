"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pushNativo, registrarDispositivo } from "@/lib/push/app-nativa";

/**
 * Dentro de la app 1.1, en todas las páginas: al tocar un aviso, abre su
 * partido; y si el usuario ya dio permiso, vuelve a mandar el token del
 * iPhone (Apple lo cambia de vez en cuando y el servidor hace upsert).
 * En el navegador y en la app 1.0 no hace nada.
 *
 * Además (4-nov, pedido del dueño): a quien aún no ha decidido sobre los
 * avisos se le ofrecen al abrir la app, con una tarjeta propia. El permiso de
 * iOS solo sale al pulsar «Activar»: iOS deja preguntarlo UNA vez, y un «No
 * permitir» en frío obliga a ir a Ajustes. «Ahora no» lo aparca una semana.
 */
const CLAVE_POSPUESTO = "avisos-app-pospuesto";
const POSPONER_MS = 7 * 86_400_000;

function pospuestoHace(): number {
  try {
    return Date.now() - Number(localStorage.getItem(CLAVE_POSPUESTO) ?? 0);
  } catch {
    return Infinity;
  }
}

export default function PuenteAvisosApp({ conSesion }: { conSesion: boolean }) {
  const router = useRouter();
  const [ofrecer, setOfrecer] = useState(false);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    const plugin = pushNativo();
    if (!plugin) return;
    const escuchas: Promise<{ remove: () => Promise<void> }>[] = [];

    escuchas.push(
      plugin.addListener("pushNotificationActionPerformed", (a) => {
        const url = a.notification.data?.url;
        // Solo rutas de la propia web.
        if (url && url.startsWith("/")) router.push(url);
      }),
    );

    plugin
      .checkPermissions()
      .then(({ receive }) => {
        if (receive === "granted") {
          if (conSesion) void registrarDispositivo(plugin);
        } else if (receive !== "denied" && pospuestoHace() > POSPONER_MS) {
          setOfrecer(true);
        }
      })
      .catch(() => {});

    return () => {
      for (const e of escuchas) void e.then((x) => x.remove()).catch(() => {});
    };
  }, [conSesion, router]);

  if (!ofrecer) return null;

  const activar = async () => {
    const plugin = pushNativo();
    if (!plugin) return;
    setTrabajando(true);
    try {
      const { receive } = await plugin.requestPermissions();
      // Sin sesión, el iPhone se registra solo en cuanto entre (arriba).
      if (receive === "granted" && conSesion) await registrarDispositivo(plugin);
    } catch {
      // Si falla, queda la opción en Perfil.
    }
    setOfrecer(false);
  };
  const posponer = () => {
    try {
      localStorage.setItem(CLAVE_POSPUESTO, String(Date.now()));
    } catch {
      // Sin almacenamiento: se volverá a ofrecer la próxima vez.
    }
    setOfrecer(false);
  };

  return (
    <div className="avisos-oferta" role="dialog" aria-label="Activar avisos">
      <p className="avisos-oferta__titulo">⚽ ¿Te avisamos?</p>
      <p className="avisos-oferta__texto">
        Los goles de tus equipos favoritos al momento y un recordatorio el día antes de cada
        jornada para que no se te olvide poner tus marcadores.
      </p>
      <div className="avisos-oferta__botones">
        <button type="button" className="btn btn--accent" onClick={activar} disabled={trabajando}>
          {trabajando ? "Activando…" : "Activar"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={posponer} disabled={trabajando}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
