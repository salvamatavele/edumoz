import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    // `dotenv/config` primeiro: os testes de isolamento entre escolas falam com a base de
    // dados real e precisam de DATABASE_URL em process.env dentro de cada worker.
    setupFiles: ["dotenv/config", "./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
