/**
 * Static bracket layout for the 2026 World Cup knockout stage.
 *
 * Each entry tells us which match goes in which column (R32..Final) and
 * what row span it occupies in a 16-row CSS grid. The order of the R32
 * matches follows FIFA's actual draw, traced backwards from the final
 * (each round's match's two children sit on consecutive rows in the
 * previous column).
 */

export type BracketSlot = {
  matchId: number;
  /** 1 = R32, 2 = R16, 3 = QF, 4 = SF, 5 = Final */
  column: 1 | 2 | 3 | 4 | 5;
  /** 1-based start row in the 16-row grid */
  gridRow: number;
  /** rows the cell spans (1, 2, 4, 8, or 16) */
  rowSpan: 1 | 2 | 4 | 8 | 16;
  /** Optional half label for grouping ("top" / "bottom") */
  half: "top" | "bottom";
};

export const BRACKET: BracketSlot[] = [
  // ─── Top half — R32 (rows 1-8) ───
  { matchId: 74, column: 1, gridRow: 1, rowSpan: 1, half: "top" },
  { matchId: 77, column: 1, gridRow: 2, rowSpan: 1, half: "top" },
  { matchId: 73, column: 1, gridRow: 3, rowSpan: 1, half: "top" },
  { matchId: 75, column: 1, gridRow: 4, rowSpan: 1, half: "top" },
  { matchId: 83, column: 1, gridRow: 5, rowSpan: 1, half: "top" },
  { matchId: 84, column: 1, gridRow: 6, rowSpan: 1, half: "top" },
  { matchId: 81, column: 1, gridRow: 7, rowSpan: 1, half: "top" },
  { matchId: 82, column: 1, gridRow: 8, rowSpan: 1, half: "top" },
  // ─── Bottom half — R32 (rows 9-16) ───
  { matchId: 76, column: 1, gridRow: 9, rowSpan: 1, half: "bottom" },
  { matchId: 78, column: 1, gridRow: 10, rowSpan: 1, half: "bottom" },
  { matchId: 79, column: 1, gridRow: 11, rowSpan: 1, half: "bottom" },
  { matchId: 80, column: 1, gridRow: 12, rowSpan: 1, half: "bottom" },
  { matchId: 86, column: 1, gridRow: 13, rowSpan: 1, half: "bottom" },
  { matchId: 88, column: 1, gridRow: 14, rowSpan: 1, half: "bottom" },
  { matchId: 85, column: 1, gridRow: 15, rowSpan: 1, half: "bottom" },
  { matchId: 87, column: 1, gridRow: 16, rowSpan: 1, half: "bottom" },

  // ─── R16 (8 matches, span 2) ───
  { matchId: 89, column: 2, gridRow: 1, rowSpan: 2, half: "top" },   // 74 vs 77
  { matchId: 90, column: 2, gridRow: 3, rowSpan: 2, half: "top" },   // 73 vs 75
  { matchId: 93, column: 2, gridRow: 5, rowSpan: 2, half: "top" },   // 83 vs 84
  { matchId: 94, column: 2, gridRow: 7, rowSpan: 2, half: "top" },   // 81 vs 82
  { matchId: 91, column: 2, gridRow: 9, rowSpan: 2, half: "bottom" },  // 76 vs 78
  { matchId: 92, column: 2, gridRow: 11, rowSpan: 2, half: "bottom" }, // 79 vs 80
  { matchId: 95, column: 2, gridRow: 13, rowSpan: 2, half: "bottom" }, // 86 vs 88
  { matchId: 96, column: 2, gridRow: 15, rowSpan: 2, half: "bottom" }, // 85 vs 87

  // ─── QF (4 matches, span 4) ───
  { matchId: 97, column: 3, gridRow: 1, rowSpan: 4, half: "top" },    // 89 vs 90
  { matchId: 98, column: 3, gridRow: 5, rowSpan: 4, half: "top" },    // 93 vs 94
  { matchId: 99, column: 3, gridRow: 9, rowSpan: 4, half: "bottom" }, // 91 vs 92
  { matchId: 100, column: 3, gridRow: 13, rowSpan: 4, half: "bottom" }, // 95 vs 96

  // ─── SF (2 matches, span 8) ───
  { matchId: 101, column: 4, gridRow: 1, rowSpan: 8, half: "top" },    // 97 vs 98
  { matchId: 102, column: 4, gridRow: 9, rowSpan: 8, half: "bottom" }, // 99 vs 100

  // ─── Final (1 match, span 16) ───
  { matchId: 104, column: 5, gridRow: 1, rowSpan: 16, half: "top" }, // 101 vs 102
];

/** Match #103 is the 3rd-place play-off, shown apart from the bracket. */
export const THIRD_PLACE_MATCH_ID = 103;

export const COLUMN_LABELS: Record<number, string> = {
  1: "Dieciseisavos",
  2: "Octavos",
  3: "Cuartos",
  4: "Semis",
  5: "Final",
};
