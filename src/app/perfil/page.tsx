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
    <main className="page">
      <section className="phero">
        <div className="wrap">
          <p className="eyebrow">Cuenta</p>
          <h1 className="phero__title">
            Tu <span style={{ color: "var(--accent)" }}>perfil</span>
            <span className="dot">.</span>
          </h1>
        </div>
      </section>

      <section className="section">
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div className="grid" style={{ display: "grid", gap: 18 }}>
            <div className="acard">
              <h2>Datos personales</h2>
              <p className="sub">
                Cambia tu nombre, usuario o teléfono cuando quieras.
              </p>
              <ProfileForm
                defaultName={displayName}
                defaultUsername={username}
                defaultPhone={phone}
              />
            </div>

            <div className="acard">
              <h2>Email</h2>
              {hasEmailProvider ? (
                <>
                  <p className="sub">
                    Tu email es la llave de tu cuenta y donde reciben las
                    notificaciones.
                  </p>
                  <EmailForm currentEmail={user.email ?? ""} />
                </>
              ) : (
                <>
                  <p
                    style={{
                      marginTop: 6,
                      fontSize: "1rem",
                      fontWeight: 600,
                    }}
                  >
                    {user.email}
                  </p>
                  <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
                    Tu cuenta está vinculada a{" "}
                    <span
                      style={{
                        textTransform: "capitalize",
                        color: "var(--text)",
                      }}
                    >
                      {oauthProviders.join(", ") || "un proveedor externo"}
                    </span>
                    . Para cambiar el email, hazlo en tu cuenta de ese proveedor
                    — aquí se sincroniza automáticamente la próxima vez que
                    entres.
                  </p>
                </>
              )}
            </div>

            <div className="acard">
              <h2>Recordatorios por email</h2>
              <p className="sub">
                Te avisamos cada noche si tienes partidos sin pronosticar para
                el día siguiente, y los domingos un resumen de toda la semana.
              </p>
              <div className="setting">
                <div className="setting__t">
                  <b>{profile?.wants_reminders ? "Activos" : "Desactivados"}</b>
                  <span>
                    {profile?.wants_reminders
                      ? "Recibes los emails de la quiniela."
                      : "No recibes recordatorios. Puedes activarlos cuando quieras."}
                  </span>
                </div>
                <form action={setReminders}>
                  <input
                    type="hidden"
                    name="wants_reminders"
                    value={profile?.wants_reminders ? "false" : "true"}
                  />
                  <button
                    type="submit"
                    className={
                      profile?.wants_reminders
                        ? "btn btn--ghost"
                        : "btn btn--accent"
                    }
                  >
                    {profile?.wants_reminders ? "Desactivar" : "Activar"}
                  </button>
                </form>
              </div>
            </div>

            <div className="acard">
              <PasswordForm hasPassword={hasPassword} />
            </div>
          </div>

          {profile?.joined_at && (
            <p className="mono" style={{ marginTop: 24, color: "var(--text-dim)" }}>
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
      </section>
    </main>
  );
}
