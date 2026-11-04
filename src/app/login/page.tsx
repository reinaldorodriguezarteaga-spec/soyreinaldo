import LoginForm from "./login-form";
import { isAppRequest } from "@/lib/is-app";

/** Facebook visible para todos (cuando Meta publique la app). */
const FACEBOOK_PUBLICO = false;

export const metadata = {
  title: "Entrar | Soy Reinaldo",
  description:
    "Entra en tu cuenta de Soy Reinaldo con tu email, Google, Apple o Facebook.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; facebook?: string }>;
}) {
  const params = await searchParams;
  const redirect = params.redirect ?? "/quiniela";
  const inApp = await isAppRequest();
  // Facebook, oculto hasta que Meta publique la app (4-nov): Meta exige una
  // prueba real del inicio de sesión antes, y esa la hace el dueño con
  // /login?facebook=1. Al publicarla, poner FACEBOOK_PUBLICO = true.
  const conFacebook = FACEBOOK_PUBLICO || params.facebook === "1";

  return (
    <main className="wrap auth-wrap">
      <div className="auth">
        <div className="auth__logo">
          <span className="brand__mark">R</span>
          <span>Soy Reinaldo</span>
        </div>
        <div className="auth__card">
          <h1>Entra a la comunidad</h1>
          <p className="sub">Pronostica, compite y debate con el resto de culés.</p>
          <LoginForm redirect={redirect} inApp={inApp} conFacebook={conFacebook} />
        </div>
      </div>
    </main>
  );
}
