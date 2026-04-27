"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Stadium } from "@/data/stadiums";

const stadiumIcon = L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#a5b4fc;color:#050505;font-size:18px;box-shadow:0 0 0 3px #050505,0 4px 12px rgba(0,0,0,0.4);">⚽</div>`,
  className: "stadium-marker",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

type Props = {
  stadiums: Stadium[];
};

export default function StadiumMap({ stadiums }: Props) {
  return (
    <MapContainer
      center={[40.7, -2]}
      zoom={6}
      scrollWheelZoom={false}
      className="h-[420px] w-full overflow-hidden rounded-2xl border border-zinc-800"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {stadiums.map((s) => (
        <Marker key={s.slug} position={s.coords} icon={stadiumIcon}>
          <Popup>
            <div style={{ minWidth: "180px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>{s.name}</div>
              <div style={{ fontSize: "12px", color: "#71717a", marginTop: "2px" }}>
                {s.club}
              </div>
              <a
                href={`#${s.slug}`}
                style={{
                  display: "inline-block",
                  marginTop: "8px",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#4f46e5",
                }}
              >
                Ver detalles ↓
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
