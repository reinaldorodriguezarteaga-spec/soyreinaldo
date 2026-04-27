import Link from "next/link";

export const metadata = {
  title: "Contacto | Soy Reinaldo",
  description: "Contacta con Reinaldo para colaboraciones o dudas.",
};

export default function ContactoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ← Volver
        </Link>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
          Contacto
        </h1>
        <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
          Próximamente. Por ahora puedes escribirme por cualquiera de mis redes.
        </p>
      </div>
    </main>
  );
}
