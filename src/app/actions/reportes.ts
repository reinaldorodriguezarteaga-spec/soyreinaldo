"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notificarUsuario } from "@/lib/push/server";

/**
 * «Reportar un fallo» (migración 113, 5-nov): guarda el reporte y avisa a los
 * administradores al móvil. Sin sesión también vale (un contacto opcional por
 * si hay que preguntar). Freno: 5 reportes por hora y por IP.
 */
export type TipoReporte = "dato" | "fallo" | "otro";

export async function enviarReporte(entrada: {
  tipo: TipoReporte;
  texto: string;
  url: string;
  contexto?: string;
  contacto?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const texto = entrada.texto.trim().slice(0, 2000);
  if (texto.length < 3) return { ok: false, error: "Cuéntanos un poco qué está mal." };
  const tipo: TipoReporte = ["dato", "fallo", "otro"].includes(entrada.tipo) ? entrada.tipo : "otro";

  // Solo rutas de la propia web (nada de URLs externas en el panel).
  let url = "/";
  try {
    const u = new URL(entrada.url, "https://www.soyreinaldo.com");
    url = (u.pathname + u.search).slice(0, 500);
  } catch {}

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
  const ipHash = createHash("sha256").update(`reportes:${ip}`).digest("hex").slice(0, 32);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return { ok: false, error: "No se pudo enviar ahora." };
  const admin = createAdmin(supabaseUrl, key, { auth: { persistSession: false } });

  const hora = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin
    .from("reportes")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("creado", hora);
  if ((count ?? 0) >= 5) return { ok: false, error: "Has enviado varios seguidos. Prueba en un rato." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await admin.from("reportes").insert({
    tipo,
    texto,
    url,
    contexto: entrada.contexto?.trim().slice(0, 200) || null,
    contacto: entrada.contacto?.trim().slice(0, 200) || null,
    user_id: user?.id ?? null,
    navegador: (h.get("user-agent") ?? "").slice(0, 300),
    ip_hash: ipHash,
  });
  if (error) return { ok: false, error: "No se pudo enviar ahora." };

  // Aviso a los administradores (best-effort).
  try {
    const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true);
    const titulo = tipo === "dato" ? "🔢 Dato mal reportado" : tipo === "fallo" ? "🐞 Fallo reportado" : "📝 Nuevo reporte";
    await Promise.all(
      ((admins ?? []) as { id: string }[]).map((a) =>
        notificarUsuario(a.id, { title: titulo, body: texto.slice(0, 140), url: "/admin/reportes", tag: "reportes" }, 24 * 3600),
      ),
    );
  } catch {}
  return { ok: true };
}
