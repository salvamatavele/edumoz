export class RequestBodyError extends Error {
  constructor(readonly status: 400 | 413) { super("Invalid request body"); }
}

/** Enforce the actual streamed size, even when Content-Length is absent or incorrect. */
export async function readBoundedBody(request: Request, limit: number): Promise<ArrayBuffer> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new RequestBodyError(400);
    if (Number(declared) > limit) throw new RequestBodyError(413);
  }
  if (!request.body) return new ArrayBuffer(0);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        try { await reader.cancel(); } catch {}
        throw new RequestBodyError(413);
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof RequestBodyError) throw error;
    throw new RequestBodyError(400);
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body.buffer;
}
