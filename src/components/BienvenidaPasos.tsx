import { Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { clienteServicio } from "@/lib/quiniela-liga/jornada-datos";
import BienvenidaCerrar from "./BienvenidaCerrar";

async function cargar() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const db = clienteServicio();
    if (!user || !db) return null;

    const [alta, perfil, pronosticos, duelos] = await Promise.all([
      db.auth.admin.getUserById(user.id),
      supabase.from("profiles").select("mi_equipo_id").eq("id", user.id).maybeSingle(),
      supabase.from("lq_predictions").select("user_id").eq("user_id", user.id).limit(1),
      supabase.from("lq_duelos").select("id").eq("retador", user.id).limit(1),
    ]);
    if (alta.error || perfil.error || pronosticos.error || duelos.error) return null;
    const edad = Date.now() - Date.parse(alta.data.user?.created_at ?? "");
    if (!Number.isFinite(edad) || edad < 0 || edad >= 21 * 86_400_000) return null;

    const pasos = [
      { hecho: perfil.data?.mi_equipo_id != null, titulo: "Elige tu equipo", href: "/liga/laliga" },
      { hecho: !!pronosticos.data?.length, titulo: "Haz tu primer pronóstico", href: "/quiniela-liga/partidos" },
      { hecho: !!duelos.data?.length, titulo: "Reta a un amigo", href: "/quiniela-liga/ranking?vista=duelos" },
    ];
    return pasos.every((p) => p.hecho) ? null : pasos;
  } catch {
    return null;
  }
}

export default async function BienvenidaPasos() {
  const pasos = await cargar();
  if (!pasos) return null;
  return (
    <BienvenidaCerrar>
      <h2 id="bienvenida-titulo">¡Bienvenido! Tres pasos para empezar</h2>
      <ol className="bienvenida__pasos">
        {pasos.map((p, i) => (
          <li key={p.href}>
            <span className="bienvenida__numero" aria-hidden>{p.hecho ? "✓" : ["①", "②", "③"][i]}</span>
            <div>
              {p.hecho ? <span>{p.titulo} <span className="sr-only">: completado</span></span> : <Link href={p.href}>{p.titulo} →</Link>}
              {i === 0 && !p.hecho && <p>Tócalo en la tarjeta «Mi equipo» o en <Star className="ico-txt" aria-hidden /> de cualquier equipo</p>}
            </div>
          </li>
        ))}
      </ol>
    </BienvenidaCerrar>
  );
}
