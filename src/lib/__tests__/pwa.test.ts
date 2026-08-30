import { describe, expect, it } from "vitest";
import {
  esAndroid,
  esIOS,
  esMovil,
  debeReofrecerInstalacion,
  REOFRECER_INSTALACION_MS,
} from "../pwa";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const DESKTOP_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const DESKTOP_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

describe("esIOS", () => {
  it("reconoce iPhone e iPad", () => {
    expect(esIOS(IPHONE)).toBe(true);
    expect(esIOS(IPAD)).toBe(true);
  });
  it("no confunde Android ni desktop", () => {
    expect(esIOS(ANDROID_CHROME)).toBe(false);
    expect(esIOS(DESKTOP_MAC)).toBe(false);
    expect(esIOS(DESKTOP_WINDOWS)).toBe(false);
  });
});

describe("esAndroid", () => {
  it("reconoce Android", () => {
    expect(esAndroid(ANDROID_CHROME)).toBe(true);
  });
  it("no confunde iOS ni desktop", () => {
    expect(esAndroid(IPHONE)).toBe(false);
    expect(esAndroid(DESKTOP_WINDOWS)).toBe(false);
  });
});

describe("esMovil", () => {
  it("iOS y Android cuentan como móvil", () => {
    expect(esMovil(IPHONE)).toBe(true);
    expect(esMovil(ANDROID_CHROME)).toBe(true);
  });
  it("desktop no es móvil", () => {
    expect(esMovil(DESKTOP_MAC)).toBe(false);
    expect(esMovil(DESKTOP_WINDOWS)).toBe(false);
  });
});

describe("debeReofrecerInstalacion", () => {
  const ahora = 1_700_000_000_000;

  it("nunca cerrado -> se ofrece", () => {
    expect(debeReofrecerInstalacion(null, ahora)).toBe(true);
  });

  it("cerrado hace un minuto -> no se reofrece todavía", () => {
    expect(debeReofrecerInstalacion(ahora - 60_000, ahora)).toBe(false);
  });

  it("justo en el borde del plazo -> todavía no", () => {
    expect(
      debeReofrecerInstalacion(ahora - REOFRECER_INSTALACION_MS, ahora),
    ).toBe(false);
  });

  it("pasado el plazo -> se reofrece", () => {
    expect(
      debeReofrecerInstalacion(ahora - REOFRECER_INSTALACION_MS - 1, ahora),
    ).toBe(true);
  });
});
