import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.fn();
const singleMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: getUserMock },
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
    }),
  }),
}));

import { updateSession } from "../middleware";

// Una promesa que no resuelve nunca: así se veía Supabase durante el
// incidente del 27–28-ago-2026 (getUser colgado → 504 del middleware).
const cuelgue = () => new Promise(() => {});

const usuario = { data: { user: { id: "user-1" } } };
const anonimo = { data: { user: null } };

function peticion(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

async function conTimeoutVencido(path: string) {
  const pendiente = updateSession(peticion(path));
  await vi.advanceTimersByTimeAsync(5_000);
  return pendiente;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  getUserMock.mockReset();
  singleMock.mockReset();
});

describe("updateSession con Supabase caído (getUser colgado)", () => {
  it("las rutas públicas siguen sirviendo, como anónimo", async () => {
    getUserMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("las excepciones públicas de /quiniela también", async () => {
    getUserMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/quiniela-liga");
    expect(res.status).toBe(200);
  });

  it("los prefijos protegidos cierran a /login", async () => {
    getUserMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/quiniela");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fquiniela",
    );
  });

  it("/admin cierra a /login", async () => {
    getUserMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/admin");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fadmin",
    );
    expect(singleMock).not.toHaveBeenCalled();
  });

  it("la cookie de invitación se sigue sembrando en /unirse/CODE", async () => {
    getUserMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/unirse/CONOS");
    expect(res.status).toBe(200);
    expect(res.cookies.get("pending_invite")?.value).toBe("CONOS");
  });
});

describe("gating de /admin con la consulta a profiles colgada", () => {
  it("usuario con sesión pero sin veredicto de is_admin → /login", async () => {
    getUserMock.mockResolvedValue(usuario);
    singleMock.mockImplementation(cuelgue);
    const res = await conTimeoutVencido("/admin");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fadmin",
    );
  });
});

describe("updateSession con Supabase sano (sin regresiones)", () => {
  it("un no-admin de verdad va a la raíz, no a /login", async () => {
    getUserMock.mockResolvedValue(usuario);
    singleMock.mockResolvedValue({ data: { is_admin: false } });
    const res = await updateSession(peticion("/admin"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("un admin pasa", async () => {
    getUserMock.mockResolvedValue(usuario);
    singleMock.mockResolvedValue({ data: { is_admin: true } });
    const res = await updateSession(peticion("/admin"));
    expect(res.status).toBe(200);
  });

  it("un usuario con sesión entra a /quiniela", async () => {
    getUserMock.mockResolvedValue(usuario);
    const res = await updateSession(peticion("/quiniela"));
    expect(res.status).toBe(200);
  });

  it("un anónimo en /quiniela va a /login", async () => {
    getUserMock.mockResolvedValue(anonimo);
    const res = await updateSession(peticion("/quiniela"));
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fquiniela",
    );
  });

  it("el reenvío del código PKCE no espera a getUser", async () => {
    const res = await updateSession(
      peticion("/?code=123e4567-e89b-42d3-a456-426614174000"),
    );
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth/callback?code=123e4567-e89b-42d3-a456-426614174000",
    );
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
