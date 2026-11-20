export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export const API_VERSION = "v1";

export function isNeonAuthConfigured(): boolean {
  return Boolean(readEnv("NEON_AUTH_BASE_URL") && readEnv("NEON_AUTH_JWKS_URL"));
}
