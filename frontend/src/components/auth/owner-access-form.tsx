"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";

export function OwnerAccessForm() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/backend/auth/owner-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string | { message?: string } | null;
          message?: string | null;
        } | null;
        setError(
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message ??
              data?.message ??
              "Owner access was denied.",
        );
        return;
      }

      setSecret("");
      router.replace("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="ks-auth-card" onSubmit={handleSubmit}>
      <h2 className="ks-auth-title">Owner access</h2>
      <p className="ks-auth-subtitle">
        Enter the owner secret to sign in with owner privileges.
      </p>

      {error && <div className="ks-auth-error">{error}</div>}

      <div className="ks-auth-field">
        <label className="ks-auth-label" htmlFor="owner-secret">
          Owner secret
        </label>
        <div className="ks-auth-input-wrap">
          <Icon name="lock" className="ks-auth-input-icon" />
          <input
            id="owner-secret"
            name="owner-secret"
            type={showSecret ? "text" : "password"}
            autoComplete="off"
            required
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            placeholder="Enter owner secret"
            className="ks-auth-input ks-auth-input-password"
          />
          <button
            type="button"
            onClick={() => setShowSecret((visible) => !visible)}
            aria-label={showSecret ? "Hide owner secret" : "Show owner secret"}
            className="ks-auth-eye"
          >
            <Icon name={showSecret ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>

      <div className="ks-auth-btn-wrap">
        <button type="submit" className="ks-auth-button" disabled={loading}>
          {loading ? (
            <>
              <Icon name="refresh" className="animate-spin" />
              Checking...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </div>
    </form>
  );
}
