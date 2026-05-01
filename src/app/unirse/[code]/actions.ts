"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const PENDING_INVITE_COOKIE = "pending_invite";

async function clearPendingInviteCookie() {
  const jar = await cookies();
  jar.delete(PENDING_INVITE_COOKIE);
}

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
    await clearPendingInviteCookie();
    redirect(
      `/unirse/${encodeURIComponent(code!)}?error=${encodeURIComponent(error.message)}`,
    );
  }

  const leagueId = (data as { league_id?: string } | null)?.league_id;
  await clearPendingInviteCookie();
  revalidatePath("/quiniela");
  redirect(
    leagueId ? `/quiniela/ranking/${leagueId}?bienvenida=1` : "/quiniela",
  );
}

export async function dismissInvite(formData: FormData) {
  const target = (formData.get("target") as string | null) ?? "/quiniela";
  await clearPendingInviteCookie();
  revalidatePath("/quiniela");
  redirect(target);
}
