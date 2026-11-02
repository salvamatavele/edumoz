// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readBoundedBody } from "./request-body-limit";

describe("bounded HTTP bodies", () => {
  it("preserves an allowed form body byte for byte", async () => {
    const input = "identifier=synthetic%40example.invalid&password=Synthetic-Only!";
    const request = new Request("http://localhost/auth", { method: "POST", body: input });
    expect(new TextDecoder().decode(await readBoundedBody(request, 1024))).toBe(input);
  });
  it("rejects an oversized declared length before consuming the stream", async () => {
    const request = new Request("http://localhost/auth", { method: "POST", body: "x", headers: { "Content-Length": "2048" } });
    await expect(readBoundedBody(request, 1024)).rejects.toMatchObject({ status: 413 });
    expect(request.bodyUsed).toBe(false);
  });
  it("limits chunked bodies without trusting Content-Length", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(700)); }, cancel() { cancelled = true; } });
    const request = new Request("http://localhost/auth", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readBoundedBody(request, 1024)).rejects.toMatchObject({ status: 413 });
    expect(cancelled).toBe(true);
  });
  it("counts bytes rather than string characters", async () => {
    const request = new Request("http://localhost/auth", { method: "POST", body: "á".repeat(10) });
    await expect(readBoundedBody(request, 10)).rejects.toMatchObject({ status: 413 });
  });
  it("does not expose stream failure details", async () => {
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.error(Error("private-token")); } });
    const request = new Request("http://localhost/auth", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    await expect(readBoundedBody(request, 1024)).rejects.toMatchObject({ status: 400, message: "Invalid request body" });
  });
});
