import Link from "next/link";
import LoginForm from "./login-form";

export const metadata = {
  title: "Entrar | Soy Reinaldo",
  description:
    "Accede a la quiniela del Mundial 2026 con tu email — sin contraseñas.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirect = params.redirect ?? "/quiniela";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Quiniela Mundial 2026
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Entrar.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Entra con tu email y contraseña, o si lo prefieres pide un enlace
            mágico al email y entra con un click.
          </p>
        </header>

        <LoginForm redirect={redirect} />

        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
          Aforo limitado a 100 personas. Al registrarte aceptas las reglas
          básicas: pronósticos hasta el inicio de cada partido, sin ediciones
          después.
        </p>
      </div>
    </main>
  );
}
