import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PasswordForm from "@/app/perfil/password-form";

export const metadata = {
  title: "Nueva contraseña | Soy Reinaldo",
  robots: { index: false, follow: false },
};

/**
 * Aquí llega el enlace del correo de recuperación (19-nov): la sesión ya está
 * abierta y solo falta escribir la contraseña nueva.
 */
export default async function NuevaContrasenaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar");

  return (
    <main className="wrap auth-wrap">
      <div className="auth">
        <div className="auth__logo">
          <span className="brand__mark">R</span>
          <span>Soy Reinaldo</span>
        </div>
        <div className="auth__card">
          <h1>Contraseña nueva</h1>
          <p className="sub">Escríbela dos veces. Después ya puedes entrar con ella.</p>
          <PasswordForm hasPassword sinTitulo />
          <p className="auth__foot">
            <Link href="/quiniela">Seguir a la web</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
