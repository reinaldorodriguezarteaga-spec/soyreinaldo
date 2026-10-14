"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { pushNativo, registrarDispositivo } from "@/lib/push/app-nativa";

/**
 * Dentro de la app 1.1, en todas las páginas: al tocar un aviso, abre su
 * partido; y si el usuario ya dio permiso, vuelve a mandar el token del
 * iPhone (Apple lo cambia de vez en cuando y el servidor hace upsert).
 * No pinta nada. En el navegador y en la app 1.0 no hace nada.
 */
export default function PuenteAvisosApp({ conSesion }: { conSesion: boolean }) {
  const router = useRouter();

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

    if (conSesion) {
      plugin
        .checkPermissions()
        .then(({ receive }) => {
          if (receive === "granted") void registrarDispositivo(plugin);
        })
        .catch(() => {});
    }

    return () => {
      for (const e of escuchas) void e.then((x) => x.remove()).catch(() => {});
    };
  }, [conSesion, router]);

  return null;
}
