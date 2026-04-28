import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin | Soy Reinaldo",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin/ligas");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-zinc-900 bg-zinc-950/40">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-xs">
          <span className="rounded-full bg-indigo-300/10 px-2.5 py-0.5 font-medium uppercase tracking-[0.2em] text-indigo-300">
            Admin
          </span>
          <nav className="flex gap-3 text-zinc-400">
            <Link href="/admin/ligas" className="hover:text-white">
              Ligas
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
