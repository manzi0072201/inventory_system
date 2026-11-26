"use client";

import { useSettings } from "./settings/settings-store";

export function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="page-footer" data-purpose="copyright-footer">
      {settings.footerCopyright || "© 2026 Virtue Vibe Trading. All rights reserved."}
    </footer>
  );
}
