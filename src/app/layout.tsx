import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Soy Reinaldo — Fútbol con Reinaldo",
  description:
    "Web personal de Reinaldo Rodríguez (@SoyReinaldoR) — creador de contenido culé. Quiniela del Mundial, media kit, redes y bot de comentarios.",
  metadataBase: new URL("https://soyreinaldo.com"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cargar las ligas del usuario para alimentar el dropdown del header
  let userLeagues: { id: string; name: string }[] = [];
  if (user) {
    const { data } = await supabase
      .from("league_members")
      .select("league:leagues(id, name)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true })
      .returns<{ league: { id: string; name: string } | null }[]>();
    userLeagues = (data ?? [])
      .map((r) => r.league)
      .filter((l): l is { id: string; name: string } => !!l);
  }

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header initialUser={user} userLeagues={userLeagues} />
        {children}
      </body>
    </html>
  );
}
