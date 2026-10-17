const quitarTildes = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Apodos de los equipos de los que más habla el canal. El resto, por su nombre. */
const APODOS: Record<string, string[]> = {
  barcelona: ["barca", "barcelona", "cule", "blaugrana"],
  "real madrid": ["madrid", "madridismo", "madridista", "merengue", "bernabeu"],
  "atletico madrid": ["atleti", "atletico"],
  "athletic club": ["athletic"],
  "real sociedad": ["real sociedad", "la real"],
  "paris saint germain": ["psg", "paris"],
  "manchester city": ["city"],
  "manchester united": ["united"],
  "bayern munich": ["bayern"],
};

/** Palabras que no identifican a un equipo por sí solas. */
const COMUNES = new Set([
  "real", "club", "de", "del", "la", "el", "fc", "cf", "sc", "ac", "afc", "cd", "ud", "sd",
  "united", "city", "sporting", "deportivo", "atletico", "madrid", "saint",
]);

export function apodos(equipo: string): string[] {
  const n = quitarTildes(equipo).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return [];
  if (APODOS[n]) return APODOS[n];
  const palabras = n.split(" ").filter((p) => p.length >= 4 && !COMUNES.has(p));
  return palabras.length ? palabras : [n];
}

export function nombraEquipo(titulo: string, equipo: string): boolean {
  const t = ` ${quitarTildes(titulo).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()} `;
  return apodos(equipo).some((a) => t.includes(` ${a} `) || t.includes(` ${a}s `));
}

