"use client";

import { useAccess } from "@/components/access/access-provider";
import { useLanguage } from "@/components/language/language-provider";
import { Icon, type IconName } from "@/components/ui/icon";
import { api, ApiClientError, uploadImage } from "@/lib/api";
import { roleLabel } from "@/lib/access-data";
import { initials } from "@/lib/avatar";
import { localeFor } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type DetailState = {
  name: string;
  email: string;
  phone: string;
  shopZone: string;
};

type PasswordState = {
  currentPassword: string;
  password: string;
  confirmPassword: string;
};

const emptyPasswordState: PasswordState = {
  currentPassword: "",
  password: "",
  confirmPassword: "",
};

export function ProfilePage({ edit = false }: { edit?: boolean }) {
  const { user, isSuperAdmin, enabledPermissionCount } = useAccess();
  const { t, language } = useLanguage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [details, setDetails] = useState<DetailState>({
    name: user.name,
    email: user.email,
    phone: user.phone,
    shopZone: user.shopZone,
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [imageError, setImageError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwords, setPasswords] = useState<PasswordState>(emptyPasswordState);

  useEffect(() => {
    setDetails({
      name: user.name,
      email: user.email,
      phone: user.phone,
      shopZone: user.shopZone,
    });
    setAvatarUrl(user.avatarUrl ?? "");
    setAvatarFile(null);
    setAvatarChanged(false);
  }, [user.id, user.name, user.email, user.phone, user.shopZone, user.avatarUrl]);

  function formatDate(value: string | null, withTime = false): string {
    if (!value) return t("Never");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString(localeFor(language), {
      dateStyle: "medium",
      ...(withTime ? { timeStyle: "short" as const } : {}),
      timeZone: "UTC",
    });
  }

  function updateDetail(key: keyof DetailState, value: string) {
    setDetails((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
    setProfileError("");
  }

  function updatePassword(key: keyof PasswordState, value: string) {
    setPasswords((current) => ({ ...current, [key]: value }));
    setPasswordMessage("");
    setPasswordError("");
  }

  function handleAvatarFile(file: File | undefined) {
    if (!file) return;
    setImageError("");
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setImageError("Choose a PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setImageError("Profile images must be smaller than 5 MB.");
      return;
    }
    setAvatarFile(file);
    setAvatarChanged(true);
    setAvatarUrl(URL.createObjectURL(file));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError("");
    setProfileMessage("");
    try {
      const input: {
        name: string;
        phone: string;
        shopZone: string;
        avatarUrl?: string | null;
      } = {
        name: details.name,
        phone: details.phone,
        shopZone: details.shopZone,
      };
      if (avatarChanged) {
        input.avatarUrl = avatarFile
          ? await uploadImage("avatar", avatarFile)
          : null;
      }
      await api.updateProfile(input);
      setProfileMessage(t("Profile updated."));
      setAvatarChanged(false);
      setAvatarFile(null);
      router.refresh();
    } catch (cause) {
      setProfileError(
        cause instanceof ApiClientError
          ? cause.message
          : t("Unable to save your profile."),
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (passwords.password !== passwords.confirmPassword) {
      setPasswordError(t("Passwords do not match."));
      return;
    }
    if (passwords.password.length < 8) {
      setPasswordError(t("Passwords must be at least 8 characters."));
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(
        passwords.currentPassword,
        passwords.password,
      );
      setPasswordMessage(t("Password updated."));
      setPasswords(emptyPasswordState);
      router.refresh();
    } catch (cause) {
      setPasswordError(
        cause instanceof ApiClientError
          ? cause.message
          : t("Unable to update your password."),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  const accountDetails: { icon: IconName; label: string; value: string }[] = [
    { icon: "mail", label: t("Email"), value: user.email },
    { icon: "phone", label: t("Phone"), value: user.phone || "—" },
    { icon: "warehouse", label: t("Shop zone"), value: user.shopZone },
    { icon: "user", label: t("Role"), value: t(roleLabel(user.role)) },
    {
      icon: "calendar",
      label: t("Last sign in"),
      value: formatDate(user.lastLogin, true),
    },
    { icon: "checkCircle", label: t("Member since"), value: formatDate(user.createdAt) },
  ];

  const forms = (
    <>
      <section className="panel">
        <div className="panel-heading">
          <h2>{t("Edit profile")}</h2>
          <span className="panel-count">{t("Personal details")}</span>
        </div>
        <form className="panel-body profile-edit-form" onSubmit={saveProfile}>
          <div className="profile-avatar-editor">
            <div className="profile-hero-avatar profile-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t("Profile image preview")} />
              ) : (
                initials(details.name || user.name)
              )}
              <i className="profile-presence" />
            </div>
            <div className="profile-avatar-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" className="w-[14px] h-[14px]" />
                {t("Change photo")}
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  className="ghost-button danger"
                  onClick={() => {
                    setAvatarUrl("");
                    setAvatarFile(null);
                    setAvatarChanged(true);
                    setImageError("");
                  }}
                >
                  {t("Remove")}
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="settings-logo-input"
                onChange={(event) => {
                  void handleAvatarFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <p className="filter-hint">
                {t("PNG, JPG, WebP or GIF. Up to 5 MB.")}
              </p>
              {imageError ? <p className="field-error">{imageError}</p> : null}
            </div>
          </div>

          <div className="form-grid">
            <div className="filter-field">
              <label htmlFor="profile-name">{t("Full name")}</label>
              <input
                id="profile-name"
                className="filter-input"
                value={details.name}
                onChange={(event) => updateDetail("name", event.target.value)}
                maxLength={120}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="profile-email">{t("Email address")}</label>
                <input
                  id="profile-email"
                  type="email"
                  className="filter-input"
                  value={details.email}
                  readOnly
                  maxLength={180}
                />

            </div>
            <div className="filter-field">
              <label htmlFor="profile-phone">{t("Phone")}</label>
              <input
                id="profile-phone"
                className="filter-input"
                value={details.phone}
                onChange={(event) => updateDetail("phone", event.target.value)}
                maxLength={40}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="profile-zone">{t("Shop zone")}</label>
              <input
                id="profile-zone"
                className="filter-input"
                value={details.shopZone}
                onChange={(event) => updateDetail("shopZone", event.target.value)}
                maxLength={80}
              />
            </div>
          </div>

          <div className="profile-form-actions">
            {profileError ? <p className="field-error">{profileError}</p> : null}
            {profileMessage ? (
              <p className="profile-form-message success">{profileMessage}</p>
            ) : null}
            <button type="submit" className="primary-button" disabled={savingProfile}>
              {savingProfile ? t("Saving...") : t("Save changes")}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>{t("Change password")}</h2>
          <span className="panel-count">{t("Security")}</span>
        </div>
        <form className="panel-body profile-edit-form" onSubmit={savePassword}>
          <div className="form-grid">
            <div className="filter-field">
              <label htmlFor="current-password">{t("Current password")}</label>
              <input
                id="current-password"
                type="password"
                className="filter-input"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={(event) => updatePassword("currentPassword", event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="new-password">{t("New password")}</label>
              <input
                id="new-password"
                type="password"
                className="filter-input"
                autoComplete="new-password"
                value={passwords.password}
                onChange={(event) => updatePassword("password", event.target.value)}
              />
            </div>
            <div className="filter-field">
              <label htmlFor="confirm-password">{t("Confirm new password")}</label>
              <input
                id="confirm-password"
                type="password"
                className="filter-input"
                autoComplete="new-password"
                value={passwords.confirmPassword}
                onChange={(event) => updatePassword("confirmPassword", event.target.value)}
              />
            </div>
          </div>
          <p className="filter-hint">
            {t("Email confirmation for password changes will be added later.")}
          </p>
          <div className="profile-form-actions">
            {passwordError ? <p className="field-error">{passwordError}</p> : null}
            {passwordMessage ? (
              <p className="profile-form-message success">{passwordMessage}</p>
            ) : null}
            <button type="submit" className="primary-button" disabled={savingPassword}>
              {savingPassword ? t("Updating...") : t("Update password")}
            </button>
          </div>
        </form>
      </section>
    </>
  );

  if (edit) {
    return (
      <div className="profile-page">
        <div className="page-heading">
          <div>
            <div className="breadcrumb">
              <span>{t("Account")}</span>
              <span>/</span>
              <span>{t("Profile")}</span>
              <span>/</span>
              <span>{t("Edit profile")}</span>
            </div>
            <h1>{t("Edit profile")}</h1>
            <p>{t("Update your photo, contact details, and password.")}</p>
          </div>
          <Link href="/profile" className="ghost-button">
            <Icon name="arrowLeft" className="w-[14px] h-[14px]" />
            {t("Back to profile")}
          </Link>
        </div>
        {forms}
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            <span>{t("Account")}</span>
            <span>/</span>
            <span>{t("Profile")}</span>
          </div>
          <h1>{t("My profile")}</h1>
          <p>{t("Review your account details, role, and workspace access.")}</p>
        </div>
        <span
          className={`profile-page-status${user.status === "Active" ? " active" : ""}`}
        >
          <Icon
            name={user.status === "Active" ? "checkCircle" : "alertCircle"}
            className="w-[13px] h-[13px]"
          />
          {t(user.status)}
        </span>
      </div>

      <div className="profile-page-grid">
        <section className="panel profile-hero">
          <div className="profile-hero-banner" />
          <div className="profile-hero-body">
            <div className="profile-hero-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" />
              ) : (
                initials(details.name || user.name)
              )}
              <i className="profile-presence" />
            </div>
            <h2>{details.name || user.name}</h2>
            <span className="profile-page-role">{t(roleLabel(user.role))}</span>
            <p>{details.email || user.email}</p>
            <div className="profile-hero-id">
              <span>{t("Account ID")}</span>
              <b>{user.id}</b>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h2>{t("Account details")}</h2>
            <span className="panel-count">{t("Verified account")}</span>
          </div>
          <div className="panel-body profile-details">
            {accountDetails.map((detail) => (
              <div className="profile-detail" key={detail.label}>
                <span className="profile-detail-icon">
                  <Icon name={detail.icon} className="w-[15px] h-[15px]" />
                </span>
                <div>
                  <small>{detail.label}</small>
                  <b>{detail.value}</b>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel profile-access-panel">
        <div className="panel-heading">
          <h2>{t("Access overview")}</h2>
          <span className="panel-count">
            {enabledPermissionCount} {t("permissions enabled")}
          </span>
        </div>
        <div className="panel-body profile-access-grid">
          <div className="profile-access-stat">
            <span className="profile-access-icon">
              <Icon name="userManagement" className="w-[17px] h-[17px]" />
            </span>
            <div>
              <b>{t("Role")}</b>
              <small>{t(roleLabel(user.role))}</small>
            </div>
          </div>
          <div className="profile-access-stat">
            <span className="profile-access-icon">
              <Icon name="lock" className="w-[17px] h-[17px]" />
            </span>
            <div>
              <b>{t("Permissions")}</b>
              <small>
                {isSuperAdmin ? t("Full access") : `${enabledPermissionCount} ${t("enabled")}`}
              </small>
            </div>
          </div>
          <div className="profile-access-stat">
            <span className="profile-access-icon">
              <Icon name="checkCircle" className="w-[17px] h-[17px]" />
            </span>
            <div>
              <b>{t("Status")}</b>
              <small>{t(user.status)}</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
