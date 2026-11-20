import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const backendUrl = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

type RouteContext = { params: Promise<{ path: string[] }> };

function forwardHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (
      key === "host" ||
      key === "connection" ||
      key === "content-length" ||
      key === "accept-encoding" ||
      key === "expect"
    ) {
      return;
    }
    headers.set(key, value);
  });
  headers.set("accept-encoding", "identity");
  return headers;
}

function responseHeaders(source: Headers): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (
      key === "content-length" ||
      key === "content-encoding" ||
      key === "transfer-encoding" ||
      key === "connection"
    ) {
      return;
    }
    headers.append(key, value);
  });
  return headers;
}

async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const incoming = new URL(request.url);
  const target = new URL(`${backendUrl}/api/${path.map(encodeURIComponent).join("/")}`);
  target.search = incoming.search;

  const method = request.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  let body: ArrayBuffer | undefined;
  if (hasBody) body = await request.arrayBuffer();

  const response = await fetch(target, {
    method,
    headers: forwardHeaders(request),
    body,
    cache: "no-store",
    redirect: "manual",
  });

  const payload = await response.arrayBuffer();
  return new NextResponse(payload, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders(response.headers),
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function POST(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, (await context.params).path);
}
