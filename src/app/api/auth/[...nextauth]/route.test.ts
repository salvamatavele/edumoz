// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/config", () => ({ handlers: { GET: vi.fn(), POST: vi.fn(async (request: Request) => new Response(await request.text())) } }));
const { handlers } = await import("@/lib/auth/config");
const { POST } = await import("./route");
describe("authentication route body boundary", () => {
  beforeEach(() => { vi.mocked(handlers.POST).mockClear(); });
  it("forwards the complete request context and body to Auth.js", async () => {
    const input = "csrfToken=synthetic&identifier=840000111";
    const response = await POST(new NextRequest("http://localhost:3011/api/auth/callback/credentials", { method: "POST", headers: { cookie: "authjs.csrf-token=synthetic", "content-type": "application/x-www-form-urlencoded" }, body: input }));
    expect(await response.text()).toBe(input);
    const forwarded = vi.mocked(handlers.POST).mock.calls[0][0];
    expect(forwarded.url).toBe("http://localhost:3011/api/auth/callback/credentials");
    expect(forwarded.headers.get("cookie")).toBe("authjs.csrf-token=synthetic");
  });
  it("does not call Auth.js for an oversized body", async () => {
    const response = await POST(new NextRequest("http://localhost/api/auth/callback/credentials", { method: "POST", body: "x".repeat(65537) }));
    expect(response.status).toBe(413);
    expect(handlers.POST).not.toHaveBeenCalled();
  });
});
