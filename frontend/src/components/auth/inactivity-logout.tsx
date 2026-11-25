"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_TIMEOUT_MINUTES = 120;
const ACTIVITY_PING_THRESHOLD_MS = 30_000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
  "focus",
] as const;

type SessionConfigPayload = {
  data?: {
    sessionTimeoutMinutes?: number | string;
  };
};

export function InactivityLogout() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingRef = useRef(0);
  const signingOutRef = useRef(false);

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    await fetch("/api/backend/auth/session?reason=inactive", {
      method: "DELETE",
      keepalive: true,
    }).catch(() => undefined);
    router.replace("/login?reason=inactive");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    let removeListeners = () => undefined;

    async function start() {
      let timeoutMinutes = DEFAULT_TIMEOUT_MINUTES;
      try {
        const response = await fetch("/api/backend/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          router.replace("/login?reason=inactive");
          return;
        }
        const payload = (await response.json()) as SessionConfigPayload;
        const configured = Number(payload.data?.sessionTimeoutMinutes);
        if (Number.isFinite(configured) && configured >= 1) {
          timeoutMinutes = configured;
        }
      } catch {
        if (cancelled) return;
      }

      if (cancelled) return;
      const timeoutMs = timeoutMinutes * 60_000;

      const pingActivity = () => {
        const now = Date.now();
        if (now - lastPingRef.current < ACTIVITY_PING_THRESHOLD_MS) return;
        lastPingRef.current = now;
        void fetch("/api/backend/auth/activity", {
          method: "POST",
          keepalive: true,
          signal: controller.signal,
        }).catch(() => undefined);
      };

      const resetTimer = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          void signOut();
        }, timeoutMs);
        pingActivity();
      };

      const onVisibilityChange = () => {
        if (document.visibilityState === "visible") resetTimer();
      };

      ACTIVITY_EVENTS.forEach((event) => {
        window.addEventListener(event, resetTimer, { passive: true });
      });
      document.addEventListener("visibilitychange", onVisibilityChange);

      removeListeners = () => {
        ACTIVITY_EVENTS.forEach((event) => {
          window.removeEventListener(event, resetTimer);
        });
        document.removeEventListener("visibilitychange", onVisibilityChange);
      };

      resetTimer();
    }

    void start();

    return () => {
      cancelled = true;
      controller.abort();
      removeListeners();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router, signOut]);

  return null;
}
