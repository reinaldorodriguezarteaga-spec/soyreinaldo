/**
 * Quién escribe en soyreinaldo.com (17-oct): datos de la página "Sobre
 * Reinaldo", de la firma de los análisis y del schema.org/Person. Solo lo
 * comprobable (redes y cifras públicas); la bio la repasa el dueño.
 */
export const AUTOR = {
  nombre: "Reinaldo Rodríguez",
  usuario: "@SoyReinaldoR",
  url: "/sobre-reinaldo",
  foto: "/branding/avatar.jpg",
  lema: "Creador de contenido de fútbol: análisis, polémica y actualidad del FC Barcelona y de LaLiga.",
  redes: [
    { nombre: "Instagram", url: "https://www.instagram.com/soyreinaldor/" },
    { nombre: "YouTube", url: "https://www.youtube.com/@SoyReinaldoR" },
    { nombre: "TikTok", url: "https://www.tiktok.com/@soyreinaldor" },
    { nombre: "Facebook", url: "https://www.facebook.com/SoyReinaldo" },
    { nombre: "Threads", url: "https://www.threads.com/@soyreinaldor" },
  ],
} as const;
