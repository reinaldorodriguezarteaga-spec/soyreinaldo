import ReenviarForm from "./form";

export const metadata = {
  title: "Reenviar correo de confirmación | Soy Reinaldo",
  robots: { index: false },
};

export default function ReenviarPage() {
  return (
    <main className="wrap auth-wrap">
      <div className="auth">
        <div className="auth__logo">
          <span className="brand__mark">R</span>
          <span>Soy Reinaldo</span>
        </div>
        <div className="auth__card">
          <h1>Reenviar el correo</h1>
          <p className="sub">
            Escribe el email con el que te registraste y te mandamos un enlace nuevo para
            confirmar la cuenta.
          </p>
          <ReenviarForm />
        </div>
      </div>
    </main>
  );
}
