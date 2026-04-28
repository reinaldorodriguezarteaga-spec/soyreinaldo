export type PhaseKey =
  | "group_md1"
  | "group_md2"
  | "group_md3"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third_place"
  | "final";

export type PhaseDef = {
  /** Slug used in the URL */
  slug: string;
  /** DB enum values that belong to this UI phase */
  keys: PhaseKey[];
  label: string;
  short: string;
};

/** UI phases (Fecha 1..3, dieciseisavos..final). third_place + final share a tab. */
export const UI_PHASES: PhaseDef[] = [
  { slug: "fecha-1", keys: ["group_md1"], label: "Fecha 1", short: "F1" },
  { slug: "fecha-2", keys: ["group_md2"], label: "Fecha 2", short: "F2" },
  { slug: "fecha-3", keys: ["group_md3"], label: "Fecha 3", short: "F3" },
  { slug: "dieciseisavos", keys: ["r32"], label: "Dieciseisavos", short: "1/16" },
  { slug: "octavos", keys: ["r16"], label: "Octavos", short: "1/8" },
  { slug: "cuartos", keys: ["qf"], label: "Cuartos", short: "QF" },
  { slug: "semis", keys: ["sf"], label: "Semis", short: "SF" },
  {
    slug: "final",
    keys: ["third_place", "final"],
    label: "Final",
    short: "F",
  },
];

export function findPhaseBySlug(slug: string | undefined): PhaseDef {
  return UI_PHASES.find((p) => p.slug === slug) ?? UI_PHASES[0];
}

const KEY_TO_LABEL: Record<PhaseKey, string> = {
  group_md1: "Fecha 1",
  group_md2: "Fecha 2",
  group_md3: "Fecha 3",
  r32: "Dieciseisavos",
  r16: "Octavos",
  qf: "Cuartos",
  sf: "Semifinal",
  third_place: "Tercer puesto",
  final: "Final",
};

export function labelForKey(key: PhaseKey): string {
  return KEY_TO_LABEL[key];
}
