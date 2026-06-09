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
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Tu perfil</p>
          <h1 className="phero__title">
            Completa tu perfil<span className="dot">.</span>
          </h1>
          <p className="phero__lede">
            Hola{" "}
            {profile?.display_name ? (
              <span style={{ color: "var(--accent)" }}>
                {profile.display_name}
              </span>
            ) : (
              "amigo"
            )}
            . Ponte un usuario para entrar más rápido la próxima vez, y deja tu
            teléfono si quieres recibir recordatorios cuando se acerque un
            partido.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="acard">
            <ProfileForm
              currentUsername={profile?.username ?? null}
              currentPhone={profile?.phone_number ?? null}
              currentWantsReminders={profile?.wants_reminders ?? true}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
