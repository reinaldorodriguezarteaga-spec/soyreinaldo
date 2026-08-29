import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ComentarioForm from "./comentario-form";
import BorrarComentario from "./borrar-comentario";

type Comentario = {
  id: string;
  user_id: string;
  display_name: string;
  body: string;
  created_at: string;
};

function formatFecha(iso: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * El tablón de opiniones de un análisis. Leer puede cualquiera (los nombres
 * salen del RPC `articles_comentarios`, que es SECURITY DEFINER porque
 * `profiles` no es legible sin sesión); escribir, solo con cuenta — el
 * anónimo ve una invitación a iniciar sesión con vuelta al artículo.
 */
export default async function Comentarios({
  articleId,
  slug,
}: {
  articleId: string;
  slug: string;
}) {
  const supabase = await createClient();
  const [{ data }, autenticado] = await Promise.all([
    supabase.rpc("articles_comentarios", { p_article_id: articleId }),
    supabase.auth.getUser(),
  ]);
  const lista = (data ?? []) as Comentario[];
  const user = autenticado.data.user;

  // Para pintar el botón de borrar en todos los comentarios, no solo los
  // suyos, cuando quien mira es el admin (moderación desde la propia página).
  let esAdmin = false;
  if (user) {
    const { data: perfil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle<{ is_admin: boolean }>();
    esAdmin = perfil?.is_admin ?? false;
  }

  return (
    <div style={{ marginTop: 48 }}>
      <div className="shead">
        <h2>Opiniones</h2>
        {lista.length > 0 && (
          <span className="sh-note">
            {lista.length === 1 ? "1 comentario" : `${lista.length} comentarios`}
          </span>
        )}
      </div>

      {lista.length > 0 ? (
        <div className="panel" style={{ padding: "6px 20px" }}>
          {lista.map((c, i) => (
            <div
              key={c.id}
              style={{
                padding: "14px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <b style={{ fontSize: "0.85rem" }}>{c.display_name}</b>
                <span
                  className="mono"
                  style={{ fontSize: "0.62rem", color: "var(--text-dim)", flex: "none" }}
                >
                  {formatFecha(c.created_at)}
                </span>
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {c.body}
              </p>
              {(esAdmin || user?.id === c.user_id) && (
                <BorrarComentario id={c.id} slug={slug} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--text-dim)", margin: "0 0 4px" }}>
          Nadie ha opinado todavía. Sé el primero.
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        {user ? (
          <ComentarioForm slug={slug} />
        ) : (
          <div
            className="panel"
            style={{ padding: 22, borderStyle: "dashed", textAlign: "center" }}
          >
            <p style={{ margin: "0 0 14px", color: "var(--text-dim)" }}>
              ¿Quieres dejar tu opinión? Inicia sesión y entra al tablón.
            </p>
            <Link
              href={`/login?redirect=/analisis/${slug}`}
              className="btn btn--accent"
            >
              Iniciar sesión <span className="arr">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
