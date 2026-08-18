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
  if (!code) redirect("/quiniela-liga");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/unirse/${encodeURIComponent(code!)}`);
  }

  // Adónde lleva este código: la quiniela de clubes (LaLiga) o la del Mundial.
  const { data: previewRows } = await supabase.rpc("get_league_public_preview", {
    p_code: code!,
  });
  const preview = (previewRows?.[0] ?? null) as
    | { kind: string; is_public: boolean }
    | null;

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

  if (preview?.kind === "clubs") {
    revalidatePath("/quiniela-liga");
    redirect(
      preview.is_public
        ? "/quiniela-liga/ranking?bienvenida=1"
        : `/quiniela-liga/ranking?liga=${encodeURIComponent(code!)}&bienvenida=1`,
    );
  }

  revalidatePath("/quiniela");
  redirect(
    leagueId ? `/quiniela/ranking/${leagueId}?bienvenida=1` : "/quiniela",
  );
}

export async function dismissInvite(formData: FormData) {
  const target = (formData.get("target") as string | null) ?? "/quiniela-liga";
  await clearPendingInviteCookie();
  revalidatePath("/quiniela");
  redirect(target);
}
