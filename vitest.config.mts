import react from "@vitejs/plugin-react";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

import { assertTestDatabaseUrl } from "./src/test/database-safety";

config({ path: [".env.local", ".env"], quiet: true });
config({ path: ".env.test.local", quiet: true });
const testDatabaseUrl = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    maxWorkers: 2,
    environment: "jsdom",
    env: { DATABASE_URL: testDatabaseUrl, TEST_DATABASE_URL: testDatabaseUrl },
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
