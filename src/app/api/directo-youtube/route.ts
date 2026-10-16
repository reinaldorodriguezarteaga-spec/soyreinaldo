import { NextResponse } from "next/server";
import { getDirectoYoutube } from "@/lib/youtube/directo";

/** Lo pide la pill "Reinaldo en directo" (cada 2 min). CDN 60 s. */
export async function GET() {
  const directo = await getDirectoYoutube();
  return NextResponse.json(
    { directo },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } },
  );
}
