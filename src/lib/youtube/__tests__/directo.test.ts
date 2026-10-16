import { describe, expect, it } from "vitest";
import { leerDirecto } from "../directo";

const canon = (v: string) => `<link rel="canonical" href="https://www.youtube.com/watch?v=${v}">`;

describe("directo de YouTube", () => {
  it("en directo: id y título", () => {
    const html = `${canon("abcDEF12345")}<meta name="title" content="Barça &amp; Madrid EN DIRECTO">..."isLive":true...`;
    expect(leerDirecto(html)).toEqual({ videoId: "abcDEF12345", titulo: "Barça & Madrid EN DIRECTO" });
  });
  it("programado, ya emitido o sin directo: null", () => {
    expect(leerDirecto(`${canon("abcDEF12345")}"isUpcoming":true,"isLive":true`)).toBeNull();
    expect(leerDirecto(`${canon("abcDEF12345")}"isLiveContent":true`)).toBeNull();
    expect(leerDirecto(`<link rel="canonical" href="https://www.youtube.com/channel/UC0RK4l80AMXvWkTvDYnVKfA">`)).toBeNull();
  });
});

