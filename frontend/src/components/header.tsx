"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./ui/icon";
import { useAccess } from "./access/access-provider";
import {
  useNotifications,
  type NotificationItem,
} from "./notifications/notifications-provider";
import { roleLabel } from "@/lib/access-data";
import { initials } from "@/lib/avatar";
import { languages, localeFor, type LanguageCode } from "@/lib/i18n";
import { HistoryPanel } from "./history/history-panel";
import { useLanguage } from "./language/language-provider";
import { useSettings } from "./settings/settings-store";
import { OwnerRoleSwitch } from "./auth/owner-role-switch";

function notificationIcon(item: NotificationItem): IconName {
  switch (item.category) {
    case "stock":
      return "stock";
    case "sales":
      return "sales";
    case "purchase":
      return "purchases";
    case "sales-return":
      return "salesReturn";
    case "purchase-return":
      return "purchaseReturn";
    case "customer":
      return "people";
    case "supplier":
      return "truck";
    case "expense":
      return "expenses";
  }
}

function formatNotificationDate(value: string, language: LanguageCode): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(localeFor(language), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function LanguageFlag({ code }: { code: LanguageCode }) {
  if (code === "fr") {
    return (
      <svg className="language-flag" viewBox="0 0 60 36" aria-hidden="true">
        <rect width="20" height="36" fill="#0055A4" />
        <rect x="20" width="20" height="36" fill="#FFFFFF" />
        <rect x="40" width="20" height="36" fill="#EF4135" />
      </svg>
    );
  }

  if (code === "rw") {
    return (
      <svg className="language-flag" viewBox="0 0 60 36" aria-hidden="true">
        <rect width="60" height="18" fill="#00A1DE" />
        <rect y="18" width="60" height="12" fill="#FAD201" />
        <rect y="30" width="60" height="6" fill="#20603D" />
        <g stroke="#E5BE01" strokeWidth="1.4" strokeLinecap="round">
          <path d="M47 3v3M47 16v3M40 10h3M51 10h3M42 5l2 2M50 13l2 2M52 5l-2 2M44 13l-2 2" />
        </g>
        <circle cx="47" cy="10" r="3.2" fill="#E5BE01" />
      </svg>
    );
  }

  return (
    <svg className="language-flag" viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="36" fill="#012169" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#FFFFFF" strokeWidth="8" />
      <path d="M0 0 60 36M60 0 0 36" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v36M0 18h60" stroke="#FFFFFF" strokeWidth="12" />
      <path d="M30 0v36M0 18h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

type TopbarProps = {
  onToggleSidebar: () => void;
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const { user, isSuperAdmin } = useAccess();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSettings, hydrated: settingsHydrated } = useSettings();
  const {
    notifications,
    unreadCount,
    hydrated: notificationsHydrated,
    markRead,
    markAllRead,
  } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const currentLanguage =
    languages.find((item) => item.code === language) ?? languages[0];
  const alerts = notifications.filter((item) => item.kind === "alert");
  const activities = notifications.filter((item) => item.kind === "activity");
  const darkMode =
    settingsHydrated &&
    (settings.theme === "Dark" ||
    (settings.theme === "System" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches));

  function toggleTheme() {
    updateSettings({ theme: darkMode ? "Light" : "Dark" });
  }

  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  function toggleHistory() {
    setHistoryOpen((open) => !open);
    setLanguageOpen(false);
    setMenuOpen(false);
    setNotificationsOpen(false);
  }

  useEffect(() => {
    if (!notificationsOpen && !menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [notificationsOpen, menuOpen]);

  function selectLanguage(code: LanguageCode) {
    setLanguage(code);
    setLanguageOpen(false);
  }

  function openNotification(item: NotificationItem) {
    markRead(item.id);
    setNotificationsOpen(false);
    router.push(item.href);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/backend/auth/session", { method: "DELETE" }).catch(
      () => undefined,
    );
    router.replace("/login");
    router.refresh();
  }

  const toggleFullscreen = () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  function renderNotificationGroup(label: string, items: NotificationItem[]) {
    if (items.length === 0) return null;
    return (
      <section className="notification-section">
        <p className="notification-section-label">{label}</p>
        {items.map((item) => {
          const date = formatNotificationDate(item.occurredAt, language);
          return (
            <button
              key={item.id}
              type="button"
              className="notification-item"
              onClick={() => openNotification(item)}
            >
              <span className={`notification-icon tone-${item.tone}`}>
                <Icon name={notificationIcon(item)} className="w-4 h-4" />
              </span>
              <span className="notification-copy">
                <b>{item.title}</b>
                <small>{item.description}</small>
                {date ? <em>{date}</em> : null}
              </span>
            </button>
          );
        })}
      </section>
    );
  }

  return (
    <header className="topbar" data-purpose="top-navigation">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>
      </div>

      <div className="topbar-actions">
        <Link href="/sales" className="pos-button">
          <Icon name="pos" className="w-4 h-4" />
          POS
        </Link>

        <button
          type="button"
          className="icon-button desktop-action"
          title={t("History")}
          aria-label={t("Today's activity")}
          aria-haspopup="dialog"
          aria-expanded={historyOpen}
          onClick={toggleHistory}
        >
          <Icon name="history" className="w-[18px] h-[18px]" />
        </button>
        <button
          type="button"
          className="icon-button desktop-action"
          title={darkMode ? "Light theme" : "Dark theme"}
          aria-label={t(darkMode ? "Light theme" : "Dark theme")}
          onClick={toggleTheme}
        >
          <Icon
            name={darkMode ? "moon" : "sun"}
            className="w-[18px] h-[18px]"
          />
        </button>
        <button
          type="button"
          className="icon-button desktop-action"
          title="Fullscreen"
          onClick={toggleFullscreen}
        >
          <Icon name="fullscreen" className="w-[18px] h-[18px]" />
        </button>

        <div className="relative">
          <button
            type="button"
            className="language-button"
            title="Language"
            onClick={() => {
              setLanguageOpen((open) => !open);
              setMenuOpen(false);
              setNotificationsOpen(false);
              setHistoryOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={languageOpen}
          >
            <LanguageFlag code={currentLanguage.code} />
            <span>{currentLanguage.short}</span>
            <Icon name="chevronDown" className="w-3 h-3" />
          </button>

          {languageOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setLanguageOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-40 py-1"
              >
                {languages.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    role="menuitemradio"
                    aria-checked={language === item.code}
                    onClick={() => selectLanguage(item.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                      language === item.code
                        ? "bg-slate-50 text-slate-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <LanguageFlag code={item.code} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {language === item.code && (
                      <Icon name="check" className="w-3.5 h-3.5 text-purple-600" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="relative notification-wrap">
          <button
            type="button"
            className="icon-button notification"
            title="Notifications"
            aria-label={
              unreadCount > 0
                ? `${t("Notifications")}, ${unreadCount} ${t("unread")}`
                : t("Notifications")
            }
            aria-haspopup="dialog"
            aria-expanded={notificationsOpen}
            aria-controls="notification-panel"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setLanguageOpen(false);
              setMenuOpen(false);
              setHistoryOpen(false);
            }}
          >
            <Icon name="bell" className="w-[18px] h-[18px]" />
            {notificationsHydrated && unreadCount > 0 && (
              <i>{unreadCount > 99 ? "99+" : unreadCount}</i>
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setNotificationsOpen(false)}
                aria-hidden="true"
              />
              <div
                id="notification-panel"
                role="dialog"
                aria-label="Notifications"
                className="notification-panel"
              >
                <div className="notification-head">
                  <div className="notification-head-copy">
                    <b>Notifications</b>
                    <span>
                      {unreadCount > 0
                        ? `${unreadCount} ${t("unread")}`
                        : t("All caught up")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="notification-mark-read"
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                  >
                    Mark all read
                  </button>
                </div>

                <div className="notification-scroll">
                  {!notificationsHydrated ? (
                    <div className="notification-empty">
                      <Icon name="refresh" className="w-5 h-5" />
                      <b>Loading notifications</b>
                      <span>Checking your latest updates.</span>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="notification-empty">
                      <Icon name="checkCircle" className="w-5 h-5" />
                      <b>You are all caught up</b>
                      <span>No alerts or recent activity right now.</span>
                    </div>
                  ) : (
                    <>
                      {renderNotificationGroup("Alerts", alerts)}
                      {renderNotificationGroup("Recent activity", activities)}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className="profile"
            title={t("Account menu")}
            onClick={() => {
              setMenuOpen((open) => !open);
              setLanguageOpen(false);
              setNotificationsOpen(false);
              setHistoryOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <div className="avatar profile-avatar">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
              <i className="profile-presence" />
            </div>
            <div className="profile-trigger-copy">
              <b>{user.name}</b>
              <small>{t(roleLabel(user.role))}</small>
            </div>
            <Icon name="chevronDown" className="w-3.5 h-3.5" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="profile-panel"
                aria-label={t("Account menu")}
              >
                <div className="profile-panel-head">
                  <div className="profile-panel-avatar">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.name)}
                    <i className="profile-presence" />
                  </div>
                  <div className="profile-panel-copy">
                    <small>{t("Signed in as")}</small>
                    <b>{user.name}</b>
                    <span className="profile-role-badge">
                      {t(roleLabel(user.role))}
                    </span>
                    <em>{user.email}</em>
                  </div>
                </div>

                <div className="profile-panel-meta">
                  <span>
                    <Icon name="checkCircle" className="w-3 h-3" />
                    {t(user.status)}
                  </span>
                  <span>
                    <Icon name="warehouse" className="w-3 h-3" />
                    {user.shopZone}
                  </span>
                  <span>
                    <Icon name="phone" className="w-3 h-3" />
                    {user.phone || "—"}
                  </span>
                </div>

                <div className="profile-panel-actions">
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-panel-item"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile");
                    }}
                  >
                    <Icon name="user" className="w-4 h-4" />
                    <span>{t("Profile")}</span>
                    <Icon name="arrowRight" className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-panel-item"
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/profile?edit=1");
                    }}
                  >
                    <Icon name="edit" className="w-4 h-4" />
                    <span>{t("Edit profile")}</span>
                    <Icon name="arrowRight" className="w-3.5 h-3.5" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-panel-item"
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/settings");
                      }}
                    >
                      <Icon name="settings" className="w-4 h-4" />
                      <span>{t("Settings")}</span>
                      <Icon name="arrowRight" className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <OwnerRoleSwitch onSelected={() => setMenuOpen(false)} />
                  <button
                    type="button"
                    role="menuitem"
                    className="profile-panel-item danger"
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    <Icon name="logout" className="w-4 h-4" />
                    <span>
                      {signingOut ? t("Signing out...") : t("Sign out")}
                    </span>
                  </button>
                </div>

                <div className="profile-panel-foot">
                  <span>{t("Account ID")}</span>
                  <b>{user.id}</b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <HistoryPanel open={historyOpen} onClose={closeHistory} />
    </header>
  );
}
