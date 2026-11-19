import Link from "next/link";
import RecuperarForm from "./recuperar-form";

export const metadata = {
  title: "Recuperar contraseña | Soy Reinaldo",
  robots: { index: false, follow: false },
};

/** «¿Olvidaste tu contraseña?» desde /login (19-nov). */
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  const volver = redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login";
  return (
    <main className="wrap auth-wrap">
      <div className="auth">
        <div className="auth__logo">
          <span className="brand__mark">R</span>
          <span>Soy Reinaldo</span>
        </div>
        <div className="auth__card">
          <h1>¿Olvidaste tu contraseña?</h1>
          <p className="sub">
            Escribe el email de tu cuenta y te mandamos un enlace para poner una nueva.
          </p>
          <RecuperarForm />
          <p className="auth__foot">
            ¿Te acordaste? <Link href={volver}>Volver a entrar</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
