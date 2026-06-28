import type { Metadata } from "next";
import { Saira_Condensed, Archivo, Space_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const saira = Saira_Condensed({
  variable: "--font-saira",
  weight: ["700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soy Reinaldo — Fútbol con Reinaldo",
  description:
    "Web personal de Reinaldo Rodríguez (@SoyReinaldoR) — creador de contenido culé. Quiniela del Mundial, media kit, redes y bot de comentarios.",
  metadataBase: new URL("https://soyreinaldo.com"),
  applicationName: "Soy Reinaldo",
  appleWebApp: {
    capable: true,
    title: "SoyReinaldo",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#0a1030",
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
      className={`${saira.variable} ${archivo.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Header initialUser={user} userLeagues={userLeagues} />
        <BackButton />
        {children}
        <Footer />
      </body>
    </html>
  );
}
