import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // La sección "LaLiga" se reconvirtió en el hub del Mundial 2026.
      { source: "/laliga", destination: "/mundial", permanent: true },
    ];
  },
};

export default nextConfig;
