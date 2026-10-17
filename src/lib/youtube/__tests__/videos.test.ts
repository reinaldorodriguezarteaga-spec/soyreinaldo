import { describe, expect, it } from "vitest";
import { apodos, leerFeed, videosDelPartido, type Video } from "../videos";

const v = (id: string, titulo: string, publicado: string): Video => ({ id, titulo, publicado });

describe("vídeos del canal en la ficha del partido", () => {
  it("lee el feed RSS", () => {
    const xml = `<feed><entry><yt:videoId>XM1sRjU2pD8</yt:videoId><title>Barça &amp; Madrid</title><published>2026-10-17T10:46:10+00:00</published></entry></feed>`;
    expect(leerFeed(xml)).toEqual([{ id: "XM1sRjU2pD8", titulo: "Barça & Madrid", publicado: "2026-10-17T10:46:10+00:00" }]);
  });

  it("apodos: los grandes por apodo, el resto por su palabra distintiva", () => {
    expect(apodos("Barcelona")).toContain("barca");
    expect(apodos("Real Betis")).toEqual(["betis"]);
    expect(apodos("Atlético Madrid")).toEqual(["atleti", "atletico"]);
  });

  it("asigna por equipo y cercanía; primero la reacción posterior", () => {
    const videos = [
      v("aaaaaaaaaaa", "El madridismo llora por Vinicius", "2026-10-12T18:42:00Z"),
      v("bbbbbbbbbbb", "El Barça se juega la racha", "2026-10-13T10:00:00Z"),
      v("ccccccccccc", "Desde el chiringuito atacan al Barcelona", "2026-10-14T23:30:00Z"),
      v("ddddddddddd", "Lamine es feliz cuando lo silban", "2026-10-14T22:00:00Z"),
      v("eeeeeeeeeee", "El Barcelona de hace un mes", "2026-10-01T10:00:00Z"),
    ];
    const r = videosDelPartido(videos, { local: "Galatasaray", visitante: "Barcelona", inicio: "2026-10-14T19:00:00Z" });
    expect(r.map((x) => x.id)).toEqual(["ccccccccccc", "bbbbbbbbbbb"]);
  });

  it("Atlético no se lleva los vídeos del Real Madrid", () => {
    const videos = [v("aaaaaaaaaaa", "Gana el Madrid, llora el Madrid", "2026-10-11T10:00:00Z")];
    expect(videosDelPartido(videos, { local: "Atlético Madrid", visitante: "Sevilla", inicio: "2026-10-11T08:00:00Z" })).toEqual([]);
  });
});
