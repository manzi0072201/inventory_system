"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  canAccessPath,
  countEnabledPermissions,
  type AppUser,
  type PermissionKey,
} from "@/lib/access-data";

type AccessContextValue = {
  user: AppUser;
  isSuperAdmin: boolean;
  can: (permission: PermissionKey) => boolean;
  canPath: (pathname: string) => boolean;
  enabledPermissionCount: number;
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({
  user,
  children,
}: {
  user: AppUser;
  children: ReactNode;
}) {
  const value = useMemo<AccessContextValue>(
    () => ({
      user,
      isSuperAdmin: user.role === "super_admin",
      can: (permission) =>
        user.role === "super_admin" || user.permissions[permission],
      canPath: (pathname) => canAccessPath(user, pathname),
      enabledPermissionCount: countEnabledPermissions(user.permissions),
    }),
    [user],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess(): AccessContextValue {
  const context = useContext(AccessContext);
  if (!context) {
    throw new Error("useAccess must be used within an AccessProvider");
  }
  return context;
}
