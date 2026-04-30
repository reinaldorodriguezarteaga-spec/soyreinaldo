import Link from "next/link";
import SignupForm from "./signup-form";

export const metadata = {
  title: "Crear cuenta | Soy Reinaldo",
  description:
    "Crea tu cuenta para apuntarte a la quiniela del Mundial 2026.",
};

export default async function SignupPage({
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
            Crear <span className="text-indigo-300">cuenta</span>.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-400">
            Aforo limitado a 100 personas. Una vez dentro, nadie te quita la
            plaza.
          </p>
        </header>

        <SignupForm redirect={redirect} />
      </div>
    </main>
  );
}
