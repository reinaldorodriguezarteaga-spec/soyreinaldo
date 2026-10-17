import { ImageResponse } from "next/og";

/** Imagen 1200×630 de una tarjeta de logro (la que enseña WhatsApp/X). */
export function imagenLogro(o: { emoji: string; titulo: string; nombre: string; detalle: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 72px",
          background: "linear-gradient(135deg, #0a1030 0%, #1b2a6b 100%)",
          color: "#e8ecff",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 140, lineHeight: 1 }}>{o.emoji}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 30, letterSpacing: 4, color: "#f5c542" }}>
          {o.titulo.toUpperCase()}
        </div>
        <div style={{ display: "flex", marginTop: 12, fontSize: 72, fontWeight: 800 }}>{o.nombre}</div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 32, color: "#c5cbef" }}>{o.detalle}</div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 30, color: "#3b82f6", fontWeight: 700 }}>soyreinaldo.com</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
