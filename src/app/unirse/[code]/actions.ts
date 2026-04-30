"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function acceptInvite(formData: FormData) {
  const code = (formData.get("code") as string | null)?.trim();
  if (!code) redirect("/quiniela");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/unirse/${encodeURIComponent(code!)}`);
  }

  const { data, error } = await supabase.rpc("join_league_by_code", {
    p_code: code!,
  });

  if (error) {
    redirect(
      `/unirse/${encodeURIComponent(code!)}?error=${encodeURIComponent(error.message)}`,
    );
  }

  const leagueId = (data as { league_id?: string } | null)?.league_id;
  revalidatePath("/quiniela");
  redirect(leagueId ? `/quiniela/ranking/${leagueId}` : "/quiniela");
}
