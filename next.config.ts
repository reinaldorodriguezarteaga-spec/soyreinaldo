import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AVIF primero (17-oct): pesa ~30-50% menos que WebP; el navegador que no
  // lo entienda recibe WebP. La foto de la portada era el elemento más lento.
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    return [
      // La sección "LaLiga" vive ahora en el árbol genérico /liga/[slug].
      { source: "/laliga", destination: "/liga/laliga", permanent: true },

      // Mundial 2026 RETIRADO: la quiniela pasa a la de clubes y el hub del
      // Mundial ya no se ofrece. Redirigimos (307, por si se reactivara) en
      // vez de borrar el código —WORLD_CUP_2026 sigue siendo el valor por
      // defecto de varias funciones compartidas—.
      { source: "/quiniela", destination: "/adivina", permanent: false },
      { source: "/quiniela/:path*", destination: "/adivina", permanent: false },

      // 25-nov-2026: fuera «quiniela» de las direcciones (Apple, norma 2.3.6).
      // Los enlaces viejos (avisos, correos, Google, invitaciones) siguen
      // funcionando. El panel /admin/quiniela-liga no cambia.
      { source: "/quiniela-liga", destination: "/adivina", permanent: true },
      { source: "/quiniela-liga/:path*", destination: "/adivina/:path*", permanent: true },
      { source: "/quiniela-champions", destination: "/adivina-champions", permanent: true },
      { source: "/quiniela-champions/:path*", destination: "/adivina-champions/:path*", permanent: true },
      { source: "/mundial", destination: "/", permanent: false },
      { source: "/mundial/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
