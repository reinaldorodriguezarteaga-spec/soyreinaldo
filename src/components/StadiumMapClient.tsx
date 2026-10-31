"use client";

import dynamic from "next/dynamic";
import type { Stadium } from "@/data/stadiums";

const StadiumMap = dynamic(() => import("./StadiumMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]" />
  ),
});

export default function StadiumMapClient({
  stadiums,
}: {
  stadiums: Stadium[];
}) {
  return <StadiumMap stadiums={stadiums} />;
}
