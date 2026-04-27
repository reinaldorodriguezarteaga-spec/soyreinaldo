import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PasswordForm from "./password-form";
import ProfileForm from "./profile-form";

export const metadata = {
  title: "Perfil | Soy Reinaldo",
  description: "Gestiona tu perfil de la quiniela.",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/perfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, joined_at")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  // Identities array tells us which auth methods the user has set up.
  // If any email-provider identity exposes a stored password we treat the
  // user as already having one; otherwise this is a magic-link-only account
  // and we surface the "Establecer contraseña" copy.
  const hasPassword = (user.identities ?? []).some(
    (identity) => identity.identity_data?.["password"] !== undefined,
  );

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-8 mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Cuenta
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Tu <span className="text-indigo-300">perfil</span>.
          </h1>
        </header>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-500">
            Email
          </h2>
          <p className="mt-2 text-base font-medium">{user.email}</p>
          <p className="mt-1 text-xs text-zinc-500">
            Tu email es la llave de tu cuenta. Por seguridad no se puede cambiar
            desde aquí.
          </p>
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <ProfileForm defaultName={displayName} />
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <PasswordForm hasPassword={hasPassword} />
        </section>

        {profile?.joined_at && (
          <p className="mt-6 text-xs text-zinc-500">
            Miembro desde{" "}
            {new Date(profile.joined_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>
        )}
      </div>
    </main>
  );
}
