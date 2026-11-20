import { createRemoteJWKSet, jwtVerify } from "jose";
import { readEnv, isNeonAuthConfigured } from "@/lib/env";
import { serviceUnavailable, unauthorized } from "@/lib/errors";

export type AuthUser = {
  authUserId: string;
  email?: string;
  name?: string;
};

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) return null;
  return token.trim();
}

export async function verifyBearerToken(request: Request): Promise<AuthUser> {
  if (!isNeonAuthConfigured()) {
    throw serviceUnavailable("Neon Auth is not configured.");
  }

  const token = getBearerToken(request);
  if (!token) {
    throw unauthorized();
  }

  const jwksUrl = readEnv("NEON_AUTH_JWKS_URL");
  const issuer = readEnv("NEON_AUTH_BASE_URL");
  if (!jwksUrl || !issuer) {
    throw serviceUnavailable("Neon Auth is not configured.");
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  const { payload } = await jwtVerify(token, jwks, { issuer });

  if (!payload.sub) {
    throw unauthorized("Token has no subject.");
  }

  return {
    authUserId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    name: typeof payload.name === "string" ? payload.name : undefined,
  };
}

export async function optionalAuth(request: Request): Promise<AuthUser | null> {
  if (!getBearerToken(request)) return null;
  return verifyBearerToken(request);
}
