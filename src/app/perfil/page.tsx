import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmailForm from "./email-form";
import PasswordForm from "./password-form";
import ProfileForm from "./profile-form";
import { setReminders } from "./actions";

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
    .select("display_name, username, phone_number, wants_reminders, joined_at")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";
  const username =
    profile?.username ??
    (user.user_metadata?.username as string | undefined) ??
    "";
  const phone =
    profile?.phone_number ??
    (user.user_metadata?.phone_number as string | undefined) ??
    "";

  // Identidades del usuario para condicionar las secciones:
  //  - hasEmailProvider: tiene método email/contraseña → puede cambiar email
  //    desde aquí
  //  - hasPassword: ya tiene contraseña configurada → mostrar "Cambiar
  //    contraseña" en lugar de "Establecer"
  const identities = user.identities ?? [];
  const hasEmailProvider = identities.some((i) => i.provider === "email");
  const hasPassword = identities.some(
    (i) => i.identity_data?.["password"] !== undefined,
  );
  const oauthProviders = identities
    .filter((i) => i.provider !== "email")
    .map((i) => i.provider);

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
          <h2 className="mb-1 text-base font-semibold">Datos personales</h2>
          <p className="mb-5 text-xs text-zinc-500">
            Cambia tu nombre, usuario o teléfono cuando quieras.
          </p>
          <ProfileForm
            defaultName={displayName}
            defaultUsername={username}
            defaultPhone={phone}
          />
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-1 text-base font-semibold">Email</h2>
          {hasEmailProvider ? (
            <>
              <p className="mb-5 text-xs text-zinc-500">
                Tu email es la llave de tu cuenta y donde reciben las
                notificaciones.
              </p>
              <EmailForm currentEmail={user.email ?? ""} />
            </>
          ) : (
            <>
              <p className="mt-2 text-base font-medium">{user.email}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Tu cuenta está vinculada a{" "}
                <span className="capitalize text-zinc-300">
                  {oauthProviders.join(", ") || "un proveedor externo"}
                </span>
                . Para cambiar el email, hazlo en tu cuenta de ese proveedor —
                aquí se sincroniza automáticamente la próxima vez que entres.
              </p>
            </>
          )}
        </section>

        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-1 text-base font-semibold">Recordatorios por email</h2>
          <p className="mb-4 text-xs text-zinc-500">
            Te avisamos cada noche si tienes partidos sin pronosticar para el
            día siguiente, y los domingos un resumen de toda la semana.
          </p>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-900 bg-zinc-900/40 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-100">
                {profile?.wants_reminders ? "Activos" : "Desactivados"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {profile?.wants_reminders
                  ? "Recibes los emails de la quiniela."
                  : "No recibes recordatorios. Puedes activarlos cuando quieras."}
              </p>
            </div>
            <form action={setReminders}>
              <input
                type="hidden"
                name="wants_reminders"
                value={profile?.wants_reminders ? "false" : "true"}
              />
              <button
                type="submit"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  profile?.wants_reminders
                    ? "border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:text-white"
                    : "bg-indigo-300 text-zinc-950 hover:bg-indigo-200"
                }`}
              >
                {profile?.wants_reminders ? "Desactivar" : "Activar"}
              </button>
            </form>
          </div>
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
