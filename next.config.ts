import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // La sección "LaLiga" vive ahora en el árbol genérico /liga/[slug].
      { source: "/laliga", destination: "/liga/laliga", permanent: true },

      // Mundial 2026 RETIRADO: la quiniela pasa a la de clubes y el hub del
      // Mundial ya no se ofrece. Redirigimos (307, por si se reactivara) en
      // vez de borrar el código —WORLD_CUP_2026 sigue siendo el valor por
      // defecto de varias funciones compartidas—.
      { source: "/quiniela", destination: "/quiniela-liga", permanent: false },
      { source: "/quiniela/:path*", destination: "/quiniela-liga", permanent: false },
      { source: "/mundial", destination: "/", permanent: false },
      { source: "/mundial/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
