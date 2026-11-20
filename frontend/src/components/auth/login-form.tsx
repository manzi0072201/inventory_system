"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { settingsStorageKey } from "@/lib/settings-data";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(settingsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { theme?: unknown };
      if (parsed.theme === "System") {
        document.documentElement.dataset.theme = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches
          ? "dark"
          : "light";
      } else if (parsed.theme === "Dark" || parsed.theme === "Light") {
        document.documentElement.dataset.theme = parsed.theme.toLowerCase();
      }
    } catch {
      return;
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/backend/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        setError(
          data?.error ?? data?.message ?? "Unable to sign in. Please try again.",
        );
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

      router.replace(target);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ks-auth-card" aria-label="Sign in">
      <h1 className="ks-auth-title">Sign in</h1>
      <p className="ks-auth-subtitle">Sign in to your inventory workspace.</p>

      <form className="ks-auth-form" onSubmit={handleSubmit}>
        {error && <div className="ks-auth-error">{error}</div>}

        <div className="ks-auth-field">
          <label className="ks-auth-label" htmlFor="email">
            Email address
          </label>
          <div className="ks-auth-input-wrap">
            <Icon name="mail" className="ks-auth-input-icon" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="ks-auth-input"
            />
          </div>
        </div>

        <div className="ks-auth-field">
          <label className="ks-auth-label" htmlFor="password">
            Password
          </label>
          <div className="ks-auth-input-wrap">
            <Icon name="lock" className="ks-auth-input-icon" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="ks-auth-input ks-auth-input-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="ks-auth-eye"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>

        <div className="ks-auth-btn-wrap">
          <button type="submit" className="ks-auth-button" disabled={loading}>
            {loading ? (
              <>
                <Icon name="refresh" className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </div>

        <Link href="/forgot-password" className="ks-auth-forgot">
          Forgot password? Ask your administrator
        </Link>
      </form>

      <div className="ks-auth-footer">
        <p>© 2026</p>
        <p>All rights reserved</p>
      </div>
    </div>
  );
}
