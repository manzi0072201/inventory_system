"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiClientError } from "@/lib/api";
import type { BackendNotification } from "@/lib/api-types";
import {
  type AppNotification,
  type NotificationCategory,
  type NotificationKind,
  type NotificationTone,
} from "@/lib/notifications";

export type NotificationItem = AppNotification;

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  hydrated: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  error: string | null;
  reload: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

const kinds: NotificationKind[] = ["alert", "activity"];
const categories: NotificationCategory[] = [
  "stock",
  "sales",
  "purchase",
  "sales-return",
  "purchase-return",
  "customer",
  "supplier",
  "expense",
];
const tones: NotificationTone[] = ["danger", "warning", "success", "info"];

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function mapNotification(row: BackendNotification): AppNotification {
  return {
    id: row.id,
    kind: kinds.includes(row.kind as NotificationKind)
      ? (row.kind as NotificationKind)
      : "activity",
    category: categories.includes(row.category as NotificationCategory)
      ? (row.category as NotificationCategory)
      : "stock",
    tone: tones.includes(row.tone as NotificationTone)
      ? (row.tone as NotificationTone)
      : "info",
    title: row.title,
    description: row.description ?? "",
    href: row.href ?? "/",
    occurredAt: row.occurredAt ?? row.createdAt ?? "",
  };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.notifications();
      setItems(rows.map(mapNotification));
      setReadIds((current) => {
        const next = new Set(
          [...current].filter((id) => id.startsWith("live:")),
        );
        rows
          .filter((row) => Boolean(row.readAt))
          .forEach((row) => next.add(row.id));
        return next;
      });
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load notifications."));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const notifications = useMemo(
    () => items.filter((item) => !readIds.has(item.id)),
    [items, readIds],
  );

  const markRead = useCallback(
    (id: string) => {
      if (readIds.has(id)) return;
      setReadIds((current) => new Set(current).add(id));
      void api.markNotificationRead(id)
        .then(() => setError(null))
        .catch((cause: unknown) => {
          setError(errorMessage(cause, "Unable to mark the notification as read."));
        });
    },
    [readIds],
  );

  const markAllRead = useCallback(() => {
    const unreadIds = items
      .filter((item) => !readIds.has(item.id))
      .map((item) => item.id);
    if (unreadIds.length === 0) return;
    setReadIds((current) => {
      const next = new Set(current);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });
    void Promise.all(unreadIds.map((id) => api.markNotificationRead(id)))
      .then(() => setError(null))
      .catch((cause: unknown) => {
        setError(errorMessage(cause, "Unable to mark notifications as read."));
      });
  }, [items, readIds]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount: notifications.length,
      hydrated,
      markRead,
      markAllRead,
      error,
      reload: load,
    }),
    [notifications, hydrated, markRead, markAllRead, error, load],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}
