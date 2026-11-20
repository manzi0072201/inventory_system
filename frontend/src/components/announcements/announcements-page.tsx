"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useLanguage } from "@/components/language/language-provider";
import { Icon, type IconName } from "@/components/ui/icon";
import { api, ApiClientError } from "@/lib/api";
import type { BackendAnnouncement } from "@/lib/api-types";
import {
  type Announcement,
  type AnnouncementTone,
} from "@/lib/announcements-data";
import type { LanguageCode } from "@/lib/i18n";

type Filter = "all" | "unread";

const tones: AnnouncementTone[] = ["danger", "warning", "success", "info"];

function errorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof ApiClientError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return fallback;
}

function iconFor(tone: AnnouncementTone, icon: string | null): IconName {
  if (icon === "checkCircle" || icon === "alertCircle" || icon === "announcements" || icon === "lock") {
    return icon;
  }
  return tone === "success"
    ? "checkCircle"
    : tone === "info"
      ? "announcements"
      : "alertCircle";
}

function mapAnnouncement(
  row: BackendAnnouncement,
  language: LanguageCode,
): Announcement {
  const tone: AnnouncementTone = tones.includes(row.tone as AnnouncementTone)
    ? (row.tone as AnnouncementTone)
    : "info";
  const locale =
    language === "fr" ? "fr-FR" : language === "rw" ? "rw-RW" : "en-US";
  const date = new Date(`${String(row.date).slice(0, 10)}T00:00:00Z`);
  const formatted = Number.isNaN(date.getTime())
    ? String(row.date)
    : date.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    category: row.category || "System",
    date: formatted,
    tone,
    icon: iconFor(tone, row.icon),
  };
}

export function AnnouncementsPage() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<Announcement[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.announcements();
      setItems(rows.map((row) => mapAnnouncement(row, language)));
      setUnreadIds(new Set(rows.filter((row) => !row.readAt).map((row) => row.id)));
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to load announcements."));
    } finally {
      setHydrated(true);
    }
  }, [language]);

  useEffect(() => {
    void load();
  }, [load]);

  const unreadCount = unreadIds.size;

  const visible = useMemo(
    () =>
      filter === "unread"
        ? items.filter((item) => unreadIds.has(item.id))
        : items,
    [filter, items, unreadIds],
  );

  const markRead = useCallback(
    (id: string) => {
      if (!unreadIds.has(id)) return;
      setUnreadIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      void api.markAnnouncementRead(id)
        .then(() => setError(null))
        .catch((cause: unknown) => {
          setError(errorMessage(cause, "Unable to mark the announcement as read."));
        });
    },
    [unreadIds],
  );

  const markAllRead = useCallback(() => {
    const ids = [...unreadIds];
    if (ids.length === 0) return;
    setUnreadIds(new Set());
    void Promise.all(ids.map((id) => api.markAnnouncementRead(id)))
      .then(() => setError(null))
      .catch((cause: unknown) => {
        setError(errorMessage(cause, "Unable to mark announcements as read."));
      });
  }, [unreadIds]);

  return (
    <div className="announcements-page">
      <div className="page-heading">
        <div>
          <h1>{t("Announcements")}</h1>
          <p>
            {t(
              "Catch-up on system notices, product updates, and shop-wide changes.",
            )}
          </p>
        </div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="panel">
        <div className="panel-heading">
          <div className="notification-head-copy">
            <b>{t("Announcements")}</b>
            <span>
              {unreadCount} {t("unread")}
            </span>
          </div>
          <div className="notification-head-actions">
            <div className="range-tabs" aria-label={t("Announcements")}>
              <button
                type="button"
                className={filter === "all" ? "selected" : ""}
                onClick={() => setFilter("all")}
              >
                {t("All")}
              </button>
              <button
                type="button"
                className={filter === "unread" ? "selected" : ""}
                onClick={() => setFilter("unread")}
              >
                {t("Unread")}
              </button>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <Icon name="checkCircle" className="w-4 h-4" />
              {t("Mark all as read")}
            </button>
          </div>
        </div>

        <div className="panel-body">
          {!hydrated ? (
            <div className="notification-empty">
              <b>{t("Loading")}</b>
            </div>
          ) : visible.length === 0 ? (
            <div className="notification-empty">
              <Icon name="bell" className="w-6 h-6" />
              <b>{t("No announcements")}</b>
              <span>
                {t("You're all caught up. New notices will appear here.")}
              </span>
            </div>
          ) : (
            <div className="notification-scroll">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`notification-item${unreadIds.has(item.id) ? "" : " is-read"}`}
                  onClick={() => markRead(item.id)}
                >
                  <span className={`notification-icon tone-${item.tone}`}>
                    <Icon name={item.icon} className="w-4 h-4" />
                  </span>
                  <span className="notification-copy">
                    <b>{t(item.title)}</b>
                    <small>{t(item.body)}</small>
                    <em>
                      {t(item.category)} · {item.date}
                    </em>
                  </span>
                  {unreadIds.has(item.id) ? <span className="notification-dot" /> : null}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
