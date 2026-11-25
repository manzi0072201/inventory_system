import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessPath, requiredPermissionForPath } from "@/lib/access-data";
import { getSessionUserFromRequest } from "@/lib/api-auth";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicAsset =
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/login-image.png" ||
    /^\/icon-(192|512|1024|maskable-192|maskable-512)\.png$/.test(pathname);

  if (isPublicAsset || pathname.startsWith("/api/backend/")) {
    return NextResponse.next();
  }

  const user = await getSessionUserFromRequest(request);

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/forgot-password") {
    return NextResponse.next();
  }

  if (!user) {
    if (isApi) {
      return NextResponse.json(
        { error: "You need to sign in." },
        { status: 401 },
      );
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("next", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessPath(user, pathname)) {
    if (isApi) {
      return NextResponse.json(
        { error: "You do not have access to this resource." },
        { status: 403 },
      );
    }
    const denied = new URL("/", request.url);
    denied.searchParams.set(
      "denied",
      requiredPermissionForPath(pathname) ?? "super-admin",
    );
    return NextResponse.redirect(denied);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|manifest\\.webmanifest|sw\\.js|apple-touch-icon\\.png|icon-.*\\.png|login-image\\.png).*)",
  ],
};
