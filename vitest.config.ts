// Config mínima para los tests unitarios de la máquina de estados (§5.1).
// Independiente del build de la app (vite.config.ts usa el plugin de Lovable).
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
