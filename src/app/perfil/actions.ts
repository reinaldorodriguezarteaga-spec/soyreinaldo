"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateDisplayName(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const displayName = (formData.get("display_name") as string | null)?.trim();

  if (!displayName || displayName.length < 2) {
    return {
      status: "error",
      message: "El nombre debe tener al menos 2 caracteres.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sesión expirada. Vuelve a entrar." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return { status: "error", message: profileError.message };
  }

  await supabase.auth.updateUser({ data: { display_name: displayName } });

  revalidatePath("/", "layout");

  return {
    status: "success",
    message: "Nombre actualizado.",
  };
}
