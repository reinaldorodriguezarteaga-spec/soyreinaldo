import { createClient } from "@/lib/supabase/server";
import { formatearTotal, sumarSeguidores } from "@/lib/social/totales";

export type SocialStats = {
  ig_followers: string;
  ig_views_monthly: string;
  fb_followers: string;
  fb_views_monthly: string;
  tt_followers: string;
  tt_views_monthly: string;
  yt_subscribers: string;
  yt_views_monthly: string;
  threads_followers: string;
  total_followers: string;
  updated_at: string;
};

/**
 * Defaults para fallback si la query falla. Mantienen la web mostrando
 * algo sensato aunque la BD esté caída.
 */
const FALLBACK: SocialStats = {
  ig_followers: "54,5K",
  ig_views_monthly: "+7,7M",
  fb_followers: "43K",
  fb_views_monthly: "+8,4M",
  tt_followers: "34,4K",
  tt_views_monthly: "+4M",
  yt_subscribers: "+9.000",
  yt_views_monthly: "+1,8M",
  threads_followers: "8,7K",
  total_followers: "+149.000",
  updated_at: new Date().toISOString(),
};

/**
 * Lee los stats actuales. Server component / server action only.
 * Next.js cachea el resultado del fetch interno hasta la siguiente
 * `revalidatePath` (que se dispara desde el form de admin).
 */
export async function getSocialStats(): Promise<SocialStats> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("social_stats")
      .select(
        "ig_followers, ig_views_monthly, fb_followers, fb_views_monthly, tt_followers, tt_views_monthly, yt_subscribers, yt_views_monthly, threads_followers, total_followers, updated_at",
      )
      .eq("id", 1)
      .maybeSingle<SocialStats>();
    if (!data) return FALLBACK;

    // El total NO se lee: se suma. Escribiéndolo a mano se descuadraba —el
    // 20-ago el media kit decía 169.100 con 169.800 reales— y es un número
    // que se enseña a marcas.
    const { total } = sumarSeguidores([
      data.ig_followers,
      data.fb_followers,
      data.tt_followers,
      data.yt_subscribers,
      data.threads_followers,
    ]);

    return {
      ...data,
      total_followers: total > 0 ? formatearTotal(total) : data.total_followers,
    };
  } catch {
    return FALLBACK;
  }
}
