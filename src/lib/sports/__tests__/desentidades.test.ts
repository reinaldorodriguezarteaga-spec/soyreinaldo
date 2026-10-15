import { describe, expect, it } from "vitest";
import { desentidades } from "../api-football";

describe("desentidades", () => {
  it("el apóstrofo de la API vuelve a ser un apóstrofo, y el JSON sigue siendo válido", () => {
    const crudo = '{"name":"K. O&apos;Toole","otro":"M. O&#039;Neill","club":"Brighton &amp; Hove"}';
    const limpio = JSON.parse(desentidades(crudo));
    expect(limpio.name).toBe("K. O'Toole");
    expect(limpio.otro).toBe("M. O'Neill");
    expect(limpio.club).toBe("Brighton & Hove");
  });

  it("no toca las comillas (romperían el JSON)", () => {
    expect(desentidades('{"a":"&quot;x&quot;"}')).toBe('{"a":"&quot;x&quot;"}');
  });
});
