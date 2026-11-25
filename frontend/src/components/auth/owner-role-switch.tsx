"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useAccess } from "@/components/access/access-provider";
import { roleLabel } from "@/lib/access-data";

export function OwnerRoleSwitch({ onSelected }: { onSelected?: () => void }) {
  const { user } = useAccess();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  if (!user.ownerAccess) return null;

  const nextRole = user.role === "super_admin" ? "admin" : "super_admin";

  async function handleSwitch() {
    setSwitching(true);
    setError("");

    try {
      const response = await fetch("/api/backend/auth/owner-access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
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
              "Unable to switch role.",
        );
        return;
      }

      onSelected?.();
      window.location.reload();
    } catch {
      setError("Unable to switch role.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      className="profile-panel-item"
      onClick={handleSwitch}
      disabled={switching}
    >
      <Icon name="refresh" className="w-4 h-4" />
      <span>
        {switching
          ? "Switching..."
          : `Switch to ${roleLabel(nextRole)}`}
      </span>
      <Icon name="arrowRight" className="w-3.5 h-3.5" />
      {error ? <small className="profile-panel-error">{error}</small> : null}
    </button>
  );
}
