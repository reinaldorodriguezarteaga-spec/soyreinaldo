import { createClient } from "@/lib/supabase/server";

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
    return data ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
