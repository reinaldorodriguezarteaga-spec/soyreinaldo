import SignupForm from "./signup-form";
import { isAppRequest } from "@/lib/is-app";

export const metadata = {
  title: "Crear cuenta | Soy Reinaldo",
  description: "Crea tu cuenta para apuntarte a la quiniela del Mundial 2026.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirect = params.redirect ?? "/quiniela";
  const inApp = await isAppRequest();

  return (
    <main className="wrap auth-wrap">
      <div className="auth">
        <div className="auth__logo">
          <span className="brand__mark">R</span>
          <span>Soy Reinaldo</span>
        </div>
        <div className="auth__card">
          <h1>Crea tu cuenta</h1>
          <p className="sub">Únete a la quiniela del Mundial 2026 con la comunidad culé.</p>
          <SignupForm redirect={redirect} inApp={inApp} />
        </div>
      </div>
    </main>
  );
}
