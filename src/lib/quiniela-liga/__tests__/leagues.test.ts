import { describe, expect, it } from "vitest";
import { pickLeague, leagueHref, type ClubLeague } from "../league-utils";

const publica: ClubLeague = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  name: "Quiniela LaLiga",
  code: "LALIGA2627",
  description: null,
  isPublic: true,
  role: "member",
};
const privada: ClubLeague = {
  id: "bbbbbbbb-0000-0000-0000-000000000002",
  name: "Quiniela Pacha",
  code: "PACHA",
  description: null,
  isPublic: false,
  role: "admin",
};

describe("elegir liga desde la URL", () => {
  it("sin nada elegido, coge la primera", () => {
    expect(pickLeague([publica, privada])?.code).toBe("LALIGA2627");
  });

  it("encuentra por id, que es lo que ponen los enlaces de la app", () => {
    expect(pickLeague([publica, privada], privada.id)?.code).toBe("PACHA");
  });

  it("encuentra por código, para los enlaces repartidos a mano", () => {
    expect(pickLeague([publica, privada], "PACHA")?.code).toBe("PACHA");
  });

  it("el código no distingue mayúsculas", () => {
    expect(pickLeague([publica, privada], "pacha")?.code).toBe("PACHA");
  });

  it("si el código no es de ninguna suya, cae en la primera en vez de romper", () => {
    expect(pickLeague([publica, privada], "OTRA")?.code).toBe("LALIGA2627");
  });

  it("sin ligas devuelve null", () => {
    expect(pickLeague([])).toBeNull();
  });
});

describe("enlaces de liga", () => {
  it("no ensucia la URL en la liga pública", () => {
    expect(leagueHref("/quiniela-liga/ranking", publica)).toBe("/quiniela-liga/ranking");
  });

  it("lleva el ID de la privada, nunca el código", () => {
    const href = leagueHref("/quiniela-liga/ranking", privada);
    expect(href).toContain(privada.id);
    // El código es la llave para entrar: no debe pasearse por la barra de
    // direcciones de cada miembro.
    expect(href).not.toContain("PACHA");
  });

  it("sin liga devuelve la ruta tal cual", () => {
    expect(leagueHref("/quiniela-liga/ranking", null)).toBe("/quiniela-liga/ranking");
  });
});
