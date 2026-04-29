import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const metadata = {
  title: "Completa tu perfil | Soy Reinaldo",
};

export default async function CompletarPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/completar-perfil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, phone_number, wants_reminders")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="flex flex-1 flex-col px-6 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          href="/quiniela"
          className="text-sm text-zinc-500 transition hover:text-white"
        >
          ← Volver
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300">
            Tu perfil
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Completa tu perfil
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Hola{" "}
            {profile?.display_name ? (
              <span className="text-indigo-300">{profile.display_name}</span>
            ) : (
              "amigo"
            )}
            . Ponte un usuario para entrar más rápido la próxima vez, y deja
            tu teléfono si quieres recibir recordatorios cuando se acerque un
            partido.
          </p>
        </header>

        <ProfileForm
          currentUsername={profile?.username ?? null}
          currentPhone={profile?.phone_number ?? null}
          currentWantsReminders={profile?.wants_reminders ?? true}
        />
      </div>
    </main>
  );
}
