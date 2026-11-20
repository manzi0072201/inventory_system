import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(currentDir, "../../.env.local");

export const baseUrl =
  process.env.TEST_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

function clean(value) {
  return String(value ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function loadLocalEnv() {
  try {
    const values = new Map();
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (match && !line.trimStart().startsWith("#")) {
        values.set(match[1], clean(match[2]));
      }
    }
    return values;
  } catch {
    return new Map();
  }
}

const localEnv = loadLocalEnv();

function setting(name) {
  return clean(process.env[name] || localEnv.get(name) || "");
}

let cachedSession = null;

export async function getSession() {
  if (cachedSession) return cachedSession;

  const email =
    setting("TEST_EMAIL") || setting("DEV_ADMIN_EMAIL") || "manager@itg.local";
  const password = setting("TEST_PASSWORD") || setting("DEV_ADMIN_PASSWORD");
  if (!password) {
    throw new Error(
      "Set TEST_PASSWORD or DEV_ADMIN_PASSWORD in backend/.env.local before running integration tests.",
    );
  }

  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Sign-in failed with HTTP ${response.status}.`);
  }

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);
  const cookies = setCookies
    .map((cookie) => String(cookie).split(";")[0])
    .join("; ");
  if (!cookies) {
    throw new Error("Sign-in did not return a session cookie.");
  }

  cachedSession = { cookies };
  return cachedSession;
}

export async function apiRequest(requestPath, options = {}) {
  const { cookies } = await getSession();
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method: options.method ?? "GET",
    headers: {
      cookie: cookies,
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const rawText = await response.text();
  let body = null;
  if (rawText) {
    try {
      body = JSON.parse(rawText);
    } catch {
      body = null;
    }
  }

  return {
    status: response.status,
    ok: response.ok,
    data: body?.data ?? body,
    meta: body?.meta ?? null,
    error: body?.error ?? null,
    rawText,
  };
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}
