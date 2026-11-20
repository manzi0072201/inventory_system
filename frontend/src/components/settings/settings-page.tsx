"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { uploadImage } from "@/lib/api";
import {
  defaultSettings,
  settingsTabs,
  type SettingsTab,
  type SystemSettings,
} from "@/lib/settings-data";
import {
  settingsTabConfig,
  type SettingsField,
  type SettingsFieldOption,
} from "@/lib/settings-fields";
import { useSettings } from "./settings-store";

function optionValue(option: SettingsFieldOption) {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: SettingsFieldOption) {
  return typeof option === "string" ? option : option.label;
}

function fieldInputValue(value: SystemSettings[keyof SystemSettings]) {
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

function isDirectLogoValue(value: string): boolean {
  return (
    value.startsWith("data:") ||
    value.startsWith("/") ||
    /^https?:\/\//i.test(value)
  );
}

function LogoUploadField({
  value,
  onChange,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      setError("Choose a PNG, JPG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo files must be smaller than 5 MB.");
      return;
    }
    setUploading(true);
    onBusyChange?.(true);
    const nextPreview = URL.createObjectURL(file);
    try {
      const key = await uploadImage("logo", file);
      onChange(key);
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextPreview;
      });
    } catch {
      URL.revokeObjectURL(nextPreview);
      setError("The logo could not be uploaded — try again.");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const previewSource = previewUrl ?? (isDirectLogoValue(value) ? value : "");
  const urlValue =
    /^https?:\/\//i.test(value) || value.startsWith("/") ? value : "";

  return (
    <div className="settings-logo-field span-2">
      <div className="settings-logo-preview">
        {previewSource ? (
          <img src={previewSource} alt="Company logo preview" />
        ) : (
          <Icon name="stock" className="h-6 w-6" strokeWidth={2.2} />
        )}
      </div>
      <div className="settings-logo-copy">
        <strong>Company logo</strong>
        <p>
          Upload a PNG, JPG, WebP, or GIF from this device, or paste a hosted
          logo URL. Used on the login screen, sidebar, documents, and receipts.
        </p>
        <div className="settings-logo-actions">
          <label
            className="ghost-button"
            htmlFor="settings-logo-upload"
            aria-disabled={uploading}
          >
            <Icon name="upload" className="h-[13px] w-[13px]" />
            {uploading ? "Uploading…" : "Upload from device"}
          </label>
          <input
            id="settings-logo-upload"
            className="settings-logo-input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={uploading}
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {value && (
            <button
              type="button"
              className="ghost-button danger"
              onClick={() => {
                setError("");
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                onChange("");
              }}
            >
              <Icon name="trash" className="h-[13px] w-[13px]" />
              Remove
            </button>
          )}
        </div>
        <input
          className="filter-input"
          type="url"
          value={urlValue}
          placeholder="Or paste a hosted logo URL"
          onChange={(event) => {
            setError("");
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
            onChange(event.target.value);
          }}
        />
        {error && <p className="field-error">{error}</p>}
        {!isDirectLogoValue(value) && value && !uploading && (
          <p className="filter-hint">
            Logo uploaded. Save changes to apply it.
          </p>
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  );

  const totalFields = useMemo(
    () =>
      settingsTabs.reduce(
        (total, tab) =>
          total +
          settingsTabConfig[tab].groups.reduce(
            (count, group) => count + group.fields.length,
            0,
          ),
        0,
      ),
    [],
  );

  const config = settingsTabConfig[activeTab];

  const handleChange = (field: SettingsField, value: string) => {
    setSaved(false);
    setDraft((current) => {
      if (field.type === "toggle") {
        return {
          ...current,
          [field.key]: !Boolean(current[field.key]),
        } as SystemSettings;
      }
      if (field.type === "number") {
        const numeric = value.trim() === "" ? 0 : Number(value);
        return {
          ...current,
          [field.key]: Number.isNaN(numeric) ? 0 : numeric,
        } as SystemSettings;
      }
      return { ...current, [field.key]: value } as SystemSettings;
    });
  };

  const handleSave = () => {
    if (logoUploading) return;
    updateSettings(draft);
    setSaved(true);
  };

  const handleDiscard = () => {
    setDraft(settings);
    setSaved(false);
  };

  const handleRestoreDefaults = () => {
    if (
      !window.confirm(
        "Restore every system setting to its default value? This cannot be undone.",
      )
    ) {
      return;
    }
    resetSettings();
    setDraft(defaultSettings);
    setSaved(true);
  };

  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            <span>Administration</span>
            <span>/</span>
            <span>Settings</span>
          </div>
          <h1>System Settings</h1>
          <p>
            Configure company information, inventory rules, sales, finance,
            security, and workspace preferences.
          </p>
        </div>
        <div className="settings-heading-meta">
          <span className="settings-meta-pill">
            <Icon name="settings" className="h-[13px] w-[13px]" />
            {settingsTabs.length} categories
          </span>
          <span className="settings-meta-pill">
            <Icon name="list" className="h-[13px] w-[13px]" />
            {totalFields} preferences
          </span>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav panel" aria-label="Settings categories">
          <div className="settings-nav-head">
            <span>Configuration</span>
            <strong>{activeTab}</strong>
          </div>
          <nav>
            {settingsTabs.map((tab) => {
              const tabConfig = settingsTabConfig[tab];
              const itemCount = tabConfig.groups.reduce(
                (count, group) => count + group.fields.length,
                0,
              );
              return (
                <button
                  key={tab}
                  type="button"
                  className={`settings-nav-item ${activeTab === tab ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setSaved(false);
                  }}
                >
                  <span className="settings-nav-icon">
                    <Icon name={tabConfig.icon} className="h-[15px] w-[15px]" />
                  </span>
                  <span className="settings-nav-copy">
                    <strong>{tab}</strong>
                    <small>{itemCount} settings</small>
                  </span>
                  <Icon name="arrowRight" className="h-[13px] w-[13px]" />
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="settings-content">
          <div className="settings-savebar panel">
            <div className="settings-savebar-copy">
              <span className={`status-pill ${dirty ? "pending" : "completed"}`}>
                {dirty ? "Unsaved changes" : "All changes saved"}
              </span>
              <small>
                {dirty
                  ? "Review your changes, then save to apply them."
                  : "Settings are stored in the backend workspace."}
              </small>
            </div>
            <div className="settings-savebar-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleDiscard}
                disabled={!dirty || logoUploading}
              >
                <Icon name="refresh" className="h-[13px] w-[13px]" />
                Discard
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSave}
                disabled={!dirty || logoUploading}
              >
                <Icon name="check" className="h-[13px] w-[13px]" />
                Save changes
              </button>
            </div>
          </div>

          {saved && (
            <div className="created-banner settings-saved-banner">
              <Icon name="checkCircle" className="h-[15px] w-[15px]" />
              <span>
                <strong>{config.label}</strong> settings have been saved and
                applied to this workspace.
              </span>
            </div>
          )}

          <div className="settings-section-head">
            <span className="settings-section-icon">
              <Icon name={config.icon} className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2>{config.label}</h2>
              <p>{config.description}</p>
            </div>
          </div>

          <div className="settings-groups">
            {config.groups.map((group) => (
              <section className="panel" key={group.title}>
                <div className="panel-heading">
                  <h2>{group.title}</h2>
                  <span className="panel-count">
                    {group.fields.length} settings
                  </span>
                </div>
                <div className="panel-body">
                  {group.description && (
                    <p className="settings-group-note">{group.description}</p>
                  )}
                  <div className="settings-grid">
                    {group.fields.map((field) => {
                      const rawValue = draft[field.key];
                      const fieldId = `setting-${field.key}`;
                      if (field.type === "logo") {
                        return (
                          <LogoUploadField
                            key={field.key}
                            value={String(rawValue)}
                            onChange={(value) => handleChange(field, value)}
                            onBusyChange={setLogoUploading}
                          />
                        );
                      }
                      if (field.type === "toggle") {
                        return (
                          <label
                            className="settings-toggle-row"
                            key={field.key}
                            htmlFor={fieldId}
                          >
                            <span>
                              <strong>{field.label}</strong>
                              {field.hint && <small>{field.hint}</small>}
                            </span>
                            <input
                              id={fieldId}
                              type="checkbox"
                              checked={Boolean(rawValue)}
                              onChange={() => handleChange(field, "")}
                            />
                          </label>
                        );
                      }
                      return (
                        <div
                          className={`filter-field settings-field ${field.wide ? "span-2" : ""}`}
                          key={field.key}
                        >
                          <label htmlFor={fieldId}>{field.label}</label>
                          {field.type === "select" ? (
                            <select
                              id={fieldId}
                              className="filter-select"
                              value={fieldInputValue(rawValue)}
                              onChange={(event) =>
                                handleChange(field, event.target.value)
                              }
                            >
                              {field.options?.map((option) => (
                                <option
                                  key={optionValue(option)}
                                  value={optionValue(option)}
                                >
                                  {optionLabel(option)}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "textarea" ? (
                            <textarea
                              id={fieldId}
                              className="filter-textarea"
                              rows={3}
                              value={fieldInputValue(rawValue)}
                              placeholder={field.placeholder}
                              onChange={(event) =>
                                handleChange(field, event.target.value)
                              }
                            />
                          ) : (
                            <div
                              className={
                                field.suffix ? "settings-input-suffix" : undefined
                              }
                            >
                              <input
                                id={fieldId}
                                className="filter-input"
                                type={field.type}
                                value={fieldInputValue(rawValue)}
                                placeholder={field.placeholder}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                onChange={(event) =>
                                  handleChange(field, event.target.value)
                                }
                              />
                              {field.suffix && <span>{field.suffix}</span>}
                            </div>
                          )}
                          {field.hint && (
                            <p className="filter-hint">{field.hint}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="panel settings-danger-panel">
            <div className="panel-heading">
              <h2>Reset workspace settings</h2>
            </div>
            <div className="panel-body settings-danger-body">
              <div>
                <strong>Restore defaults</strong>
                <p>
                  Reset every category to the original Stocky configuration.
                  Company records, products, sales, and purchases are not
                  affected.
                </p>
              </div>
              <button
                type="button"
                className="ghost-button danger"
                onClick={handleRestoreDefaults}
              >
                <Icon name="refresh" className="h-[13px] w-[13px]" />
                Restore defaults
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
