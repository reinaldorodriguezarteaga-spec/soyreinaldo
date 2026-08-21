import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // Solo lógica pura: nada de DOM ni de servidor. Si algún día hacen falta
    // pruebas de componentes, se añade un entorno aparte para esos archivos.
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
