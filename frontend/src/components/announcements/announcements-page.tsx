"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { useAccess } from "@/components/access/access-provider";
import { useLanguage } from "@/components/language/language-provider";
import { Icon, type IconName } from "@/components/ui/icon";
import { api, ApiClientError } from "@/lib/api";
import type { AnnouncementInput, BackendAnnouncement } from "@/lib/api-types";
import {
  type Announcement,
  type AnnouncementTone,
} from "@/lib/announcements-data";
import type { LanguageCode } from "@/lib/i18n";

type Filter = "all" | "unread";
type EditorState = { mode: "create" } | { mode: "edit"; id: string };
type AnnouncementFormState = {
  title: string;
  body: string;
  category: string;
  date: string;
  tone: AnnouncementTone;
  icon: string;
};

const tones: AnnouncementTone[] = ["danger", "warning", "success", "info"];
const iconOptions: string[] = [
  "announcements",
  "checkCircle",
  "alertCircle",
  "lock",
  "warning",
  "check",
];

function emptyForm(): AnnouncementFormState {
  return {
    title: "",
    body: "",
    category: "",
    date: new Date().toISOString().slice(0, 10),
    tone: "info",
    icon: "announcements",
  };
}

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

function formFromAnnouncement(row: BackendAnnouncement): AnnouncementFormState {
  const tone: AnnouncementTone = tones.includes(row.tone as AnnouncementTone)
    ? (row.tone as AnnouncementTone)
    : "info";
  return {
    title: row.title,
    body: row.body,
    category: row.category ?? "",
    date: String(row.date).slice(0, 10),
    tone,
    icon: row.icon ?? "",
  };
}

export function AnnouncementsPage() {
  const { t, language } = useLanguage();
  const { can } = useAccess();
  const canManage = can("announcements");
  const [items, setItems] = useState<Announcement[]>([]);
  const [records, setRecords] = useState<BackendAnnouncement[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { items: rows } = await api.announcements();
      setRecords(rows);
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

  const openCreate = useCallback(() => {
    setForm(emptyForm());
    setEditor({ mode: "create" });
    setError(null);
  }, []);

  const openEdit = useCallback(
    (id: string) => {
      const row = records.find((entry) => entry.id === id);
      if (!row) return;
      setForm(formFromAnnouncement(row));
      setEditor({ mode: "edit", id });
      setError(null);
    },
    [records],
  );

  const closeEditor = useCallback(() => {
    if (!saving) setEditor(null);
  }, [saving]);

  const save = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canManage || !editor || saving) return;
      const title = form.title.trim();
      const body = form.body.trim();
      if (!title || !body || !form.date) {
        setError("Title, message, and date are required.");
        return;
      }
      const input: AnnouncementInput = {
        title,
        body,
        category: form.category.trim() || null,
        date: form.date,
        tone: form.tone,
        icon: form.icon || null,
      };
      setSaving(true);
      setError(null);
      try {
        if (editor.mode === "create") {
          await api.createAnnouncement(input);
        } else {
          await api.updateAnnouncement(editor.id, input);
        }
        setEditor(null);
        await load();
      } catch (cause) {
        setError(errorMessage(cause, "Unable to save the announcement."));
      } finally {
        setSaving(false);
      }
    },
    [canManage, editor, form, load, saving],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!canManage || deletingId) return;
      const item = items.find((entry) => entry.id === id);
      if (!window.confirm(`Delete "${item?.title ?? t("this announcement")}"? This cannot be undone.`)) {
        return;
      }
      setDeletingId(id);
      setError(null);
      try {
        await api.deleteAnnouncement(id);
        await load();
      } catch (cause) {
        setError(errorMessage(cause, "Unable to delete the announcement."));
      } finally {
        setDeletingId(null);
      }
    },
    [canManage, deletingId, items, load, t],
  );

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
        {canManage ? (
          <button type="button" className="primary-button" onClick={openCreate}>
            <Icon name="plus" className="w-[13px] h-[13px]" />
            {t("New announcement")}
          </button>
        ) : null}
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      <div className="panel">
        <div className="panel-heading announcement-head">
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
                <div
                  key={item.id}
                  className={`notification-item${unreadIds.has(item.id) ? "" : " is-read"}`}
                >
                  <button
                    type="button"
                    className="notification-item-main"
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
                  {canManage ? (
                    <div className="notification-item-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => openEdit(item.id)}
                        title={t("Edit announcement")}
                      >
                        <Icon name="edit" className="w-3.5 h-3.5" />
                        {t("Edit")}
                      </button>
                      <button
                        type="button"
                        className="ghost-button danger"
                        onClick={() => void remove(item.id)}
                        disabled={deletingId === item.id}
                        title={t("Delete announcement")}
                      >
                        <Icon name="trash" className="w-3.5 h-3.5" />
                        {t("Delete")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editor ? (
        <div
          className="modal-scrim"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <form
            className="modal customer-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-modal-title"
            onSubmit={save}
            noValidate
          >
            <div className="panel-heading">
              <h2 id="announcement-modal-title">
                {editor.mode === "create"
                  ? t("New announcement")
                  : t("Edit announcement")}
              </h2>
              <button
                type="button"
                className="icon-button"
                onClick={closeEditor}
                aria-label={t("Close")}
              >
                <Icon name="close" className="w-4 h-4" />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="filter-field span-2">
                  <label htmlFor="announcement-form-title">
                    {t("Title")} <span className="required-mark">*</span>
                  </label>
                  <input
                    id="announcement-form-title"
                    className="filter-input"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                  />
                </div>
                <div className="filter-field span-2">
                  <label htmlFor="announcement-form-body">
                    {t("Message")} <span className="required-mark">*</span>
                  </label>
                  <textarea
                    id="announcement-form-body"
                    className="filter-textarea"
                    rows={5}
                    value={form.body}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, body: event.target.value }))
                    }
                  />
                </div>
                <div className="filter-field">
                  <label htmlFor="announcement-form-category">{t("Category")}</label>
                  <input
                    id="announcement-form-category"
                    className="filter-input"
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, category: event.target.value }))
                    }
                  />
                </div>
                <div className="filter-field">
                  <label htmlFor="announcement-form-date">
                    {t("Date")} <span className="required-mark">*</span>
                  </label>
                  <input
                    id="announcement-form-date"
                    className="filter-input"
                    type="date"
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, date: event.target.value }))
                    }
                  />
                </div>
                <div className="filter-field">
                  <label htmlFor="announcement-form-tone">{t("Tone")}</label>
                  <select
                    id="announcement-form-tone"
                    className="filter-select"
                    value={form.tone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tone: event.target.value as AnnouncementTone,
                      }))
                    }
                  >
                    {tones.map((entry) => (
                      <option key={entry} value={entry}>
                        {t(entry.charAt(0).toUpperCase() + entry.slice(1))}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-field">
                  <label htmlFor="announcement-form-icon">{t("Icon")}</label>
                  <select
                    id="announcement-form-icon"
                    className="filter-select"
                    value={form.icon}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, icon: event.target.value }))
                    }
                  >
                    {iconOptions.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry === "checkCircle" || entry === "check"
                          ? t("Success")
                          : entry === "alertCircle" || entry === "warning"
                            ? t("Alert")
                            : entry === "lock"
                              ? t("Lock")
                              : t("Announcement")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="ghost-button"
                onClick={closeEditor}
                disabled={saving}
              >
                {t("Cancel")}
              </button>
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? t("Saving") : t("Save announcement")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
