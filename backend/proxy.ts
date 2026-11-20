import { NextResponse, type NextRequest } from "next/server";
import { readEnv } from "@/lib/env";

const allowedOrigins = new Set(
  [readEnv("FRONTEND_ORIGIN"), "http://localhost:3000"].filter(
    (value): value is string => Boolean(value),
  ),
);

function applyCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Vary", "Origin");
}

export default function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed = Boolean(origin && allowedOrigins.has(origin));

  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    if (origin && isAllowed) {
      applyCorsHeaders(response, origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      response.headers.set("Access-Control-Max-Age", "600");
    }
    return response;
  }

  const response = NextResponse.next();
  if (origin && isAllowed) {
    applyCorsHeaders(response, origin);
  }
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
