import { createNeonAuth } from "@neon/auth/next/server";
import { requireEnv } from "@/lib/env";

type NeonAuthClient = ReturnType<typeof createNeonAuth>;

let cachedAuth: NeonAuthClient | undefined;

export function getAuth(): NeonAuthClient {
  if (!cachedAuth) {
    cachedAuth = createNeonAuth({
      baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
      cookies: {
        secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
      },
    });
  }
  return cachedAuth;
}

export const auth = new Proxy({} as NeonAuthClient, {
  get(_target, property) {
    const client = getAuth();
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
