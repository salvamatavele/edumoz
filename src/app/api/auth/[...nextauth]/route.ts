import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth/config";
import { readBoundedBody, RequestBodyError } from "@/lib/http/request-body-limit";

export const GET = handlers.GET;
const MAX_AUTH_BODY_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedBody(request, MAX_AUTH_BODY_BYTES);
    return handlers.POST(new NextRequest(request.url, { method: request.method, headers: request.headers, body, signal: request.signal }));
  } catch (error) {
    if (error instanceof RequestBodyError) return Response.json({ error: "InvalidRequest" }, { status: error.status, headers: { "Cache-Control": "no-store" } });
    throw error;
  }
}
