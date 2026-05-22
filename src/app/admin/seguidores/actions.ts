"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type SocialStatsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) throw new Error("No autorizado");
  return supabase;
}

const FIELDS = [
  "ig_followers",
  "ig_views_monthly",
  "fb_followers",
  "fb_views_monthly",
  "tt_followers",
  "tt_views_monthly",
  "yt_subscribers",
  "yt_views_monthly",
  "threads_followers",
  "total_followers",
] as const;

function clean(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, 30);
}

export async function updateSocialStats(
  _prev: SocialStatsState,
  formData: FormData,
): Promise<SocialStatsState> {
  let supabase;
  try {
    supabase = await requireAdmin();
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "No autorizado",
    };
  }

  const update: Record<string, string> = {};
  for (const f of FIELDS) {
    const v = clean(formData.get(f));
    if (v) update[f] = v;
  }
  if (Object.keys(update).length === 0) {
    return { status: "error", message: "No hay nada que cambiar." };
  }
  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("social_stats")
    .update(update)
    .eq("id", 1);

  if (error) return { status: "error", message: error.message };

  // Invalidar todas las páginas que muestran estos números
  revalidatePath("/");
  revalidatePath("/redes");
  revalidatePath("/contacto");
  revalidatePath("/media-kit");

  return { status: "success", message: "Cifras actualizadas en toda la web." };
}
