"use client";

import dynamic from "next/dynamic";
import type { Stadium } from "@/data/stadiums";

const StadiumMap = dynamic(() => import("./StadiumMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900" />
  ),
});

export default function StadiumMapClient({
  stadiums,
}: {
  stadiums: Stadium[];
}) {
  return <StadiumMap stadiums={stadiums} />;
}
