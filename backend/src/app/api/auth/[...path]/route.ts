import { getAuth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

type RouteHandler = (
  request: Request,
  context?: unknown,
) => Promise<Response> | Response;

function routeHandler(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"): RouteHandler {
  return (request, context) => {
    const handlers = getAuth().handler() as unknown as Record<string, RouteHandler>;
    return handlers[method](request, context);
  };
}

export const GET = routeHandler("GET");
export const POST = routeHandler("POST");
export const PUT = routeHandler("PUT");
export const PATCH = routeHandler("PATCH");
export const DELETE = routeHandler("DELETE");
