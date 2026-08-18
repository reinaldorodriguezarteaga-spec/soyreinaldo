import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getMyClubLeagues } from "@/lib/quiniela-liga/leagues";
import QuinielaLigaTabs from "./tabs";

/** El layout resuelve en servidor a qué ligas perteneces (y dónde mandas);
 * las pestañas en sí son de cliente porque leen la ruta y el `?liga=`. */
export default async function QuinielaLigaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const leagues = user ? await getMyClubLeagues(user.id) : [];

  return (
    <>
      <Suspense fallback={null}>
        <QuinielaLigaTabs leagues={leagues} />
      </Suspense>
      {children}
    </>
  );
}
