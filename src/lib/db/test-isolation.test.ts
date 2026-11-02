// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";

const { prisma } = await import("./client");

describe("test database privileges", () => {
  afterAll(async () => { await prisma.$disconnect(); });

  it("connects to the reserved test database", async () => {
    const rows = await prisma.$queryRaw<Array<{ name: string }>>`SELECT DATABASE() AS name`;
    expect(rows[0].name).toMatch(/^edumoz_test(?:_[a-z0-9]+)*$/);
  });

  it("cannot access development tables even through raw SQL", async () => {
    // LIMIT 0 never retrieves application records, even if a privilege regression occurs.
    await expect(prisma.$queryRaw`SELECT 1 FROM edumoz.School LIMIT 0`).rejects.toThrow(/denied/i);
  });
});
