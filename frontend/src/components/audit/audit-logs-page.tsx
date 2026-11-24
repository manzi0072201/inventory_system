"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { api, ApiClientError, type AuditLogFilters } from "@/lib/api";
import type { ApiListResult, BackendAuditLog } from "@/lib/api-types";
import { Icon, type IconName } from "@/components/ui/icon";

type DraftFilters = {
  preset: string;
  start: string;
  end: string;
  action: string;
  entityType: string;
  search: string;
};

type Tone = "danger" | "success" | "info" | "warning" | "neutral";

const rangePresets = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "mtd", label: "This month" },
  { value: "ytd", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const initialDraft: DraftFilters = {
  preset: "30d",
  start: "",
  end: "",
  action: "",
  entityType: "",
  search: "",
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parsedDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimestamp(value: string): string {
  const parsed = parsedDate(value);
  if (!parsed) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  const parsed = parsedDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string): string {
  const parsed = parsedDate(value);
  if (!parsed) return "";
  return parsed.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actorLabel(row: BackendAuditLog): string {
  return row.actorName ?? row.actorEmail ?? "System";
}

function actorInitials(row: BackendAuditLog): string {
  return actorLabel(row)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function actionTone(action: string): Tone {
  const value = action.toLowerCase();
  if (/\b(delete|void|cancel|remove|revoke)\b/.test(value)) return "danger";
  if (/\b(create|add|signup|register)\b/.test(value)) return "success";
  if (/\b(payment|refund|pay|expense)\b/.test(value)) return "warning";
  if (/\b(update|edit|adjust|move|approve|confirm|complete)\b/.test(value)) {
    return "info";
  }
  return "neutral";
}

function actionIcon(action: string): IconName {
  const value = action.toLowerCase();
  if (/\b(delete|void|cancel|remove|revoke)\b/.test(value)) return "trash";
  if (/\b(create|add|signup|register)\b/.test(value)) return "plus";
  if (/\b(payment|refund|pay|expense)\b/.test(value)) return "money";
  if (/\b(sign|auth|login|logout|password)\b/.test(value)) return "lock";
  if (/\b(update|edit|adjust|move|approve|confirm|complete)\b/.test(value)) {
    return "edit";
  }
  return "history";
}

function entityIcon(entityType: string): IconName {
  const value = entityType.toLowerCase();
  if (value.includes("sale") || value.includes("return")) return "sales";
  if (value.includes("purchase") || value.includes("supplier")) return "purchases";
  if (value.includes("product") || value.includes("stock")) return "products";
  if (value.includes("payment") || value.includes("expense")) return "money";
  if (value.includes("user") || value.includes("staff")) return "userManagement";
  if (value.includes("setting") || value.includes("audit")) return "settings";
  return "list";
}

function formatData(value: unknown): string {
  if (value === null || value === undefined) return "No value recorded.";
  if (typeof value === "string" && value.trim() === "") return "Empty";
  return JSON.stringify(value, null, 2);
}

export function AuditLogsPage() {
  const [draft, setDraft] = useState<DraftFilters>(initialDraft);
  const [applied, setApplied] = useState<AuditLogFilters>({
    preset: "30d",
    page: 1,
    pageSize: 50,
  });
  const [result, setResult] = useState<ApiListResult<BackendAuditLog>>({
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await api.auditLogs(applied));
    } catch (loadError) {
      setError(
        loadError instanceof ApiClientError
          ? loadError.message
          : "Unable to load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportUrl = useMemo(() => api.auditLogsExportUrl(applied), [applied]);

  const summary = useMemo(() => {
    const actors = new Set(result.items.map((row) => row.actorId ?? actorLabel(row)));
    const entities = new Set(result.items.map((row) => row.entityType));
    return {
      total: result.pagination?.total ?? result.items.length,
      actors: result.stats?.actors ?? actors.size,
      entities: result.stats?.entities ?? entities.size,
      lastEvent:
        result.stats?.lastEvent ?? result.items[0]?.createdAt ?? "",
    };
  }, [result]);

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const next: AuditLogFilters = {
      preset: draft.preset,
      page: 1,
      pageSize: 50,
    };
    if (draft.action.trim()) next.action = draft.action.trim();
    if (draft.entityType.trim()) next.entityType = draft.entityType.trim();
    if (draft.search.trim()) next.search = draft.search.trim();
    if (draft.preset === "custom") {
      next.start = draft.start;
      next.end = draft.end;
    }
    setApplied(next);
  };

  const resetFilters = () => {
    setDraft(initialDraft);
    setApplied({ preset: "30d", page: 1, pageSize: 50 });
  };

  const pagination = result.pagination;

  return (
    <div className="audit-page">
      <div className="page-heading">
        <div>
          <span>Audit &amp; Compliance</span>
          <h1>Audit Logs</h1>
          <p>Review who changed what, when, and from which device.</p>
        </div>
        <div className="page-actions">
          <a className="ghost-button audit-export-link" href={exportUrl} download>
            <Icon name="download" className="w-3.5 h-3.5" />
            Export CSV
          </a>
          <button
            type="button"
            className="ghost-button audit-export-link"
            onClick={() => void load()}
            disabled={loading}
          >
            <Icon
              name="refresh"
              className={`w-3.5 h-3.5${loading ? " spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="audit-summary-grid">
        <div className="audit-summary-card">
          <div className="metric-copy">
            <small>Events in range</small>
            <strong>{summary.total.toLocaleString()}</strong>
          </div>
          <span className="metric-icon purple">
            <Icon name="history" className="w-4 h-4" />
          </span>
        </div>
        <div className="audit-summary-card">
          <div className="metric-copy">
            <small>Unique users</small>
            <strong>{summary.actors.toLocaleString()}</strong>
          </div>
          <span className="metric-icon blue">
            <Icon name="people" className="w-4 h-4" />
          </span>
        </div>
        <div className="audit-summary-card">
          <div className="metric-copy">
            <small>Entity types</small>
            <strong>{summary.entities.toLocaleString()}</strong>
          </div>
          <span className="metric-icon gray">
            <Icon name="grid" className="w-4 h-4" />
          </span>
        </div>
        <div className="audit-summary-card">
          <div className="metric-copy">
            <small>Most recent event</small>
            <strong>{summary.lastEvent ? formatTime(summary.lastEvent) : "—"}</strong>
            {summary.lastEvent ? (
              <span className="audit-summary-date">{formatDate(summary.lastEvent)}</span>
            ) : null}
          </div>
          <span className="metric-icon green">
            <Icon name="checkCircle" className="w-4 h-4" />
          </span>
        </div>
      </div>

      <form className="panel audit-filter-panel" onSubmit={applyFilters}>
        <div className="audit-filter-heading">
          <div>
            <h2>Filters</h2>
            <p>Narrow the trail by time, user activity, or record type.</p>
          </div>
          <span className="audit-filter-count">
            {pagination ? `${pagination.total} matching` : "Ready"}
          </span>
        </div>
        <div className="audit-filter-grid">
          <label className="audit-filter-field audit-search-field">
            <span className="audit-filter-label">Search</span>
            <span className="audit-search-wrap">
              <Icon name="search" className="w-3.5 h-3.5" />
              <input
                type="text"
                className="filter-input"
                placeholder="User, action, entity, or IP"
                aria-label="Search audit logs"
                value={draft.search}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </span>
          </label>
          <label className="audit-filter-field">
            <span className="audit-filter-label">Date range</span>
            <select
              className="filter-select"
              aria-label="Date range"
              value={draft.preset}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  preset: event.target.value,
                }))
              }
            >
              {rangePresets.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="audit-filter-field">
            <span className="audit-filter-label">Action</span>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. sale.delete"
              aria-label="Action"
              value={draft.action}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  action: event.target.value,
                }))
              }
            />
          </label>
          <label className="audit-filter-field">
            <span className="audit-filter-label">Entity type</span>
            <input
              type="text"
              className="filter-input"
              placeholder="e.g. sale"
              aria-label="Entity type"
              value={draft.entityType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  entityType: event.target.value,
                }))
              }
            />
          </label>
          {draft.preset === "custom" ? (
            <>
              <label className="audit-filter-field">
                <span className="audit-filter-label">From</span>
                <input
                  type="date"
                  className="filter-input"
                  aria-label="Start date"
                  value={draft.start}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      start: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="audit-filter-field">
                <span className="audit-filter-label">To</span>
                <input
                  type="date"
                  className="filter-input"
                  aria-label="End date"
                  value={draft.end}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      end: event.target.value,
                    }))
                  }
                />
              </label>
            </>
          ) : null}
          <div className="audit-filter-actions">
            <button type="submit" className="primary-button" disabled={loading}>
              Apply filters
            </button>
            <button
              type="button"
              className="ghost-button audit-reset-button"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {error ? <div className="form-error">{error}</div> : null}

      <section className="panel audit-log-panel">
        <div className="panel-heading audit-log-panel-heading">
          <div className="audit-heading-title">
            <span className="audit-heading-icon">
              <Icon name="history" className="w-4 h-4" />
            </span>
            <div>
              <h2>Activity timeline</h2>
              <p>
                {pagination
                  ? `${pagination.total} record(s) in the selected range`
                  : "Loading audit records"}
              </p>
            </div>
          </div>
          <span className="audit-live-pill">
            <i />
            Read-only
          </span>
        </div>

        {loading && result.items.length === 0 ? (
          <div className="audit-empty">
            <span className="audit-empty-icon">
              <Icon name="refresh" className="w-5 h-5 spin" />
            </span>
            <b>Loading activity…</b>
            <span>Fetching the latest matching audit records.</span>
          </div>
        ) : result.items.length === 0 ? (
          <div className="audit-empty">
            <span className="audit-empty-icon">
              <Icon name="search" className="w-5 h-5" />
            </span>
            <b>No activity found</b>
            <span>Try a wider date range or remove a filter.</span>
          </div>
        ) : (
          <div className={`audit-timeline${loading ? " muted" : ""}`}>
            {result.items.map((row) => {
              const tone = actionTone(row.action);
              const hasDetails =
                row.beforeData !== null ||
                row.afterData !== null ||
                Boolean(row.userAgent);
              return (
                <article className="audit-event" key={row.id}>
                  <span className={`audit-event-icon tone-${tone}`}>
                    <Icon name={actionIcon(row.action)} className="w-3.5 h-3.5" />
                  </span>
                  <div className="audit-event-main">
                    <div className="audit-event-top">
                      <span className={`audit-action tone-${tone}`}>
                        {row.action}
                      </span>
                      <span className="audit-event-entity">
                        <Icon name={entityIcon(row.entityType)} className="w-3 h-3" />
                        {row.entityType}
                      </span>
                      <time className="audit-event-time" dateTime={row.createdAt}>
                        {formatTimestamp(row.createdAt)}
                      </time>
                    </div>
                    <div className="audit-event-meta">
                      <span className="audit-meta-item">
                        <span className="audit-avatar">{actorInitials(row)}</span>
                        <b>{actorLabel(row)}</b>
                        {row.actorEmail && row.actorEmail !== actorLabel(row) ? (
                          <span className="audit-soft">· {row.actorEmail}</span>
                        ) : null}
                      </span>
                      <span className="audit-meta-item">
                        <Icon name="list" className="w-3 h-3" />
                        <span className="audit-entity-id" title={displayValue(row.entityId)}>
                          {displayValue(row.entityId) || "—"}
                        </span>
                      </span>
                      <span className="audit-meta-item">
                        <Icon name="info" className="w-3 h-3" />
                        {row.ipAddress ?? "No IP recorded"}
                      </span>
                    </div>
                    {hasDetails ? (
                      <details className="audit-event-details">
                        <summary>
                          <Icon name="eye" className="w-3.5 h-3.5" />
                          View change details
                        </summary>
                        <div className="audit-diff-grid">
                          <div className="audit-diff-card">
                            <div className="audit-diff-head">Before</div>
                            <pre>{formatData(row.beforeData)}</pre>
                          </div>
                          <div className="audit-diff-card">
                            <div className="audit-diff-head">After</div>
                            <pre>{formatData(row.afterData)}</pre>
                          </div>
                        </div>
                        {row.userAgent ? (
                          <div className="audit-context">
                            <b>Device:</b> {row.userAgent}
                          </div>
                        ) : null}
                      </details>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination ? (
          <div className="audit-pager">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div>
              <button
                type="button"
                className="ghost-button audit-reset-button"
                disabled={!pagination.hasPrevious}
                onClick={() =>
                  setApplied((current) => ({
                    ...current,
                    page: Math.max(1, (current.page ?? 1) - 1),
                  }))
                }
              >
                <Icon name="arrowLeft" className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                className="ghost-button audit-reset-button"
                disabled={!pagination.hasNext}
                onClick={() =>
                  setApplied((current) => ({
                    ...current,
                    page: (current.page ?? 1) + 1,
                  }))
                }
              >
                Next
                <Icon name="arrowRight" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="audit-note">
        <Icon name="info" className="w-3.5 h-3.5" />
        <span>
          CSV export includes up to 10,000 matching records and writes its own
          audit entry.
        </span>
      </div>
    </div>
  );
}
