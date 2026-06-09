import { permanentRedirect } from "next/navigation";

// La sección "LaLiga" se reconvirtió en el hub del Mundial 2026. Mantenemos
// la ruta como redirección permanente para no romper enlaces antiguos.
export default function LaligaPage() {
  permanentRedirect("/mundial");
}
