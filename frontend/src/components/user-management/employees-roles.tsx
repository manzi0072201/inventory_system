"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccess } from "@/components/access/access-provider";
import { Icon } from "@/components/ui/icon";
import { api, ApiClientError } from "@/lib/api";
import type { BackendUser } from "@/lib/api-types";
import {
  countEnabledPermissions,
  defaultAdminPermissions,
  permissionGroups,
  permissionKeys,
  roleLabel,
  type AdminPermissions,
  type AppUser,
  type PermissionKey,
  type UserStatus,
} from "@/lib/access-data";

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  shopZone: string;
  phone: string;
  status: UserStatus;
  permissions: AdminPermissions;
};

const emptyPermissions = (): AdminPermissions => ({ ...defaultAdminPermissions });

const emptyForm = (): FormState => ({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  shopZone: "Kigali Shop Zone",
  phone: "",
  status: "Active",
  permissions: emptyPermissions(),
});

function formFromUser(user: AppUser): FormState {
  return {
    name: user.name,
    email: user.email,
    password: "",
    confirmPassword: "",
    shopZone: user.shopZone,
    phone: user.phone,
    status: user.status,
    permissions: { ...user.permissions },
  };
}

function toAppUser(user: BackendUser): AppUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    shopZone: user.shopZone ?? "",
    phone: user.phone ?? "",
    permissions: { ...defaultAdminPermissions, ...user.permissions },
    createdAt: user.createdAt,
    lastLogin: user.lastLoginAt,
  };
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function salesOnlyPermissions(): AdminPermissions {
  const next = Object.fromEntries(
    permissionKeys.map((key) => [key, false]),
  ) as AdminPermissions;
  next.sales = true;
  next.sales_returns = true;
  next.customers = true;
  next.debtors = true;
  next.payments = true;
  return next;
}

export function EmployeesRoles() {
  const { user: currentUser } = useAccess();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadUsers = useCallback(async () => {
    setError("");
    try {
      const result = await api.users();
      setUsers(result.items.map(toAppUser));
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Unable to load employees.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const admins = users.filter((user) => user.role === "admin");
  const activeAdmins = admins.filter((user) => user.status === "Active");
  const totalEnabled = useMemo(
    () =>
      admins.reduce(
        (sum, user) => sum + countEnabledPermissions(user.permissions),
        0,
      ),
    [admins],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
    setError("");
    setBanner("");
  };

  const openEdit = (user: AppUser) => {
    setEditing(user);
    setForm(formFromUser(user));
    setFormOpen(true);
    setError("");
    setBanner("");
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setError("");
  };

  const togglePermission = (key: PermissionKey) => {
    setForm((current) => ({
      ...current,
      permissions: {
        ...current.permissions,
        [key]: !current.permissions[key],
      },
    }));
  };

  const saveEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.shopZone.trim()) {
      setError("Name, email, and shop zone are required.");
      return;
    }
    if (!editing && !form.password) {
      setError("Set a password for this employee.");
      return;
    }
    if (form.password && form.password.length < 8) {
      setError("Passwords must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        shopZone: form.shopZone,
        phone: form.phone,
      };
      if (!editing) {
        Object.assign(body, {
          role: "admin",
          status: form.status,
          password: form.password,
          permissions: form.permissions,
        });
      } else if (editing.role === "admin") {
        body.permissions = form.permissions;
        if (editing.id !== currentUser?.id) body.status = form.status;
      }
      const saved = editing
        ? await api.updateUser(editing.id, body)
        : await api.createUser(body);
      const savedUser = toAppUser(saved);

      await loadUsers();
      setEditing(savedUser);
      setForm(formFromUser(savedUser));
      setFormOpen(true);
      setBanner(
        editing
          ? "Employee access and credentials updated."
          : "Shop admin created. Share the credentials securely.",
      );
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Unable to save employee.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeEmployee = async (user: AppUser) => {
    if (
      !window.confirm(
        `Delete ${user.name}? Their login will stop working immediately.`,
      )
    ) {
      return;
    }
    setError("");
    try {
      await api.deleteUser(user.id);
      if (editing?.id === user.id) closeForm();
      await loadUsers();
      setBanner("Employee removed and credentials revoked.");
    } catch (cause) {
      setError(
        cause instanceof ApiClientError
          ? cause.message
          : "Unable to delete employee.",
      );
    }
  };

  return (
    <div className="user-management-page">
      <div className="page-heading">
        <div>
          <div className="breadcrumb">
            <span>Administration</span>
            <Icon name="arrowRight" className="h-[11px] w-[11px]" />
            <b>Employees &amp; Roles</b>
          </div>
          <h1>Employees &amp; Roles</h1>
          <p className="page-subtitle">
            Create shop admin credentials and choose exactly which modules each
            admin can open.
          </p>
        </div>
        <button type="button" className="primary-button" onClick={openCreate}>
          <Icon name="userPlus" className="h-[13px] w-[13px]" />
          New shop admin
        </button>
      </div>

      {banner && (
        <div className="created-banner" role="status">
          <Icon name="checkCircle" className="h-4 w-4" />
          {banner}
        </div>
      )}
      {error && !formOpen && (
        <div className="user-error-banner" role="alert">
          <Icon name="alert" className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="user-summary-grid">
        <div className="user-summary-card">
          <span className="user-summary-icon purple">
            <Icon name="people" className="h-[17px] w-[17px]" />
          </span>
          <div>
            <small>Team members</small>
            <strong>{users.length}</strong>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="user-summary-icon green">
            <Icon name="checkCircle" className="h-[17px] w-[17px]" />
          </span>
          <div>
            <small>Active shop admins</small>
            <strong>{activeAdmins.length}</strong>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="user-summary-icon blue">
            <Icon name="lock" className="h-[17px] w-[17px]" />
          </span>
          <div>
            <small>Enabled module grants</small>
            <strong>{totalEnabled}</strong>
          </div>
        </div>
        <div className="user-summary-card">
          <span className="user-summary-icon orange">
            <Icon name="userManagement" className="h-[17px] w-[17px]" />
          </span>
          <div>
            <small>Super admin</small>
            <strong>Protected</strong>
          </div>
        </div>
      </div>

      <div className="access-control-note">
        <Icon name="info" className="h-[15px] w-[15px]" />
        <div>
          <strong>Super admin control center</strong>
          <p>
            Only the super admin can create credentials, reset passwords,
            suspend accounts, and change module permissions. Settings and
            employee management are always locked to shop admins.
          </p>
        </div>
      </div>

      <div className={`user-management-layout ${formOpen ? "form-open" : ""}`}>
        <section className="panel user-list-panel">
          <div className="panel-heading">
            <h2>Team directory</h2>
            <span className="panel-count">{users.length} accounts</span>
          </div>
          <div className="table-scroll">
            {loading ? (
              <p className="user-empty-note">Loading employees...</p>
            ) : users.length === 0 ? (
              <p className="user-empty-note">No employee accounts yet.</p>
            ) : (
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Role / zone</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th>Last login</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className={editing?.id === user.id ? "selected" : ""}
                    >
                      <td>
                        <div className="employee-cell">
                          <span className="employee-avatar">
                            {initials(user.name)}
                          </span>
                          <div>
                            <b>{user.name}</b>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="employee-role">
                          <b>{roleLabel(user.role)}</b>
                          <small>{user.shopZone}</small>
                        </div>
                      </td>
                      <td>
                        {user.role === "super_admin" ? (
                          <span className="status-pill ordered">Full access</span>
                        ) : (
                          <span className="access-count">
                            {countEnabledPermissions(user.permissions)} /{" "}
                            {permissionKeys.length} modules
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            user.status === "Active" ? "completed" : "unpaid"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td>
                        <span className="employee-last-login">
                          {user.lastLogin
                            ? new Date(user.lastLogin).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC",
                              })
                            : "Never"}
                        </span>
                      </td>
                      <td>
                        <div className="employee-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Edit user"
                            onClick={() => openEdit(user)}
                          >
                            <Icon name="edit" className="h-4 w-4" />
                          </button>
                          {user.role === "admin" && (
                            <button
                              type="button"
                              className="icon-button danger"
                              title="Delete employee"
                              onClick={() => void removeEmployee(user)}
                            >
                              <Icon name="trash" className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {formOpen && (
          <section className="panel employee-form-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {editing
                    ? editing.role === "super_admin"
                      ? "Edit super admin"
                      : "Edit shop admin"
                    : "New shop admin"}
                </h2>
                <p className="employee-form-subtitle">
                  {editing
                    ? "Update account details, status, and access."
                    : "Set the login credentials and choose what this admin can control."}
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeForm}
                aria-label="Close form"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
            <form className="panel-body employee-form" onSubmit={saveEmployee}>
              <div className="form-grid">
                <label>
                  <span>Full name</span>
                  <input
                    className="filter-input"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="e.g. Alice Mukamana"
                  />
                </label>
                <label>
                  <span>Login email</span>
                  <input
                    className="filter-input"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="alice@shop.com"
                  />
                </label>
                <label>
                  <span>Shop zone</span>
                  <input
                    className="filter-input"
                    value={form.shopZone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        shopZone: event.target.value,
                      }))
                    }
                    placeholder="Kigali Shop Zone"
                  />
                </label>
                <label>
                  <span>Phone</span>
                  <input
                    className="filter-input"
                    value={form.phone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phone: event.target.value,
                      }))
                    }
                    placeholder="+250 ..."
                  />
                </label>
                {editing?.role !== "super_admin" && (
                  <>
                    <label>
                      <span>{editing ? "New password" : "Password"}</span>
                      <input
                        className="filter-input"
                        type="password"
                        value={form.password}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        placeholder={
                          editing
                            ? "Leave blank to keep current"
                            : "At least 6 characters"
                        }
                        autoComplete="new-password"
                      />
                    </label>
                    <label>
                      <span>Confirm password</span>
                      <input
                        className="filter-input"
                        type="password"
                        value={form.confirmPassword}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            confirmPassword: event.target.value,
                          }))
                        }
                        placeholder="Repeat password"
                        autoComplete="new-password"
                      />
                    </label>
                  </>
                )}
                <label>
                  <span>Account status</span>
                  <select
                    className="filter-select"
                    value={form.status}
                    disabled={editing?.id === currentUser?.id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as UserStatus,
                      }))
                    }
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </label>
              </div>

              {editing?.role !== "super_admin" && (
                <div className="permission-editor">
                  <div className="permission-editor-head">
                  <div>
                    <h3>Module permissions</h3>
                    <p>
                      Toggle exactly what this shop admin can control. Turning a
                      module off hides it from their sidebar and blocks the
                      route.
                    </p>
                  </div>
                  <div className="permission-presets">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: emptyPermissions(),
                        }))
                      }
                    >
                      Defaults
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: salesOnlyPermissions(),
                        }))
                      }
                    >
                      Sales only
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: Object.fromEntries(
                            permissionKeys.map((key) => [key, true]),
                          ) as AdminPermissions,
                        }))
                      }
                    >
                      Allow all
                    </button>
                    <button
                      type="button"
                      className="ghost-button danger"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          permissions: Object.fromEntries(
                            permissionKeys.map((key) => [key, false]),
                          ) as AdminPermissions,
                        }))
                      }
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="permission-groups">
                  {permissionGroups.map((group) => (
                    <section className="permission-group" key={group.title}>
                      <div className="permission-group-head">
                        <b>{group.title}</b>
                        <small>{group.description}</small>
                      </div>
                      <div className="permission-group-list">
                        {group.permissions.map((permission) => (
                          <label className="permission-row" key={permission.key}>
                            <input
                              type="checkbox"
                              checked={form.permissions[permission.key]}
                              onChange={() => togglePermission(permission.key)}
                            />
                            <span className="permission-check" aria-hidden="true">
                              <Icon name="check" className="h-3 w-3" />
                            </span>
                            <span>
                              <b>{permission.label}</b>
                              <small>{permission.description}</small>
                            </span>
                          </label>
                        ))}
                      </div>
                    </section>
                  ))}
                  </div>
                </div>
              )}

              {error && <p className="field-error">{error}</p>}

              <div className="employee-form-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  <Icon
                    name={saving ? "refresh" : "check"}
                    className={`h-[13px] w-[13px] ${saving ? "spin" : ""}`}
                  />
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Create shop admin"}
                </button>
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
