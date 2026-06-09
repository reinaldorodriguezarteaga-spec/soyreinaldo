import LoginForm from "./login-form";

export const metadata = {
  title: "Entrar | Soy Reinaldo",
  description:
    "Accede a la quiniela del Mundial 2026 con tu email o con Google.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirect = params.redirect ?? "/quiniela";

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
          <LoginForm redirect={redirect} />
        </div>
      </div>
    </main>
  );
}
