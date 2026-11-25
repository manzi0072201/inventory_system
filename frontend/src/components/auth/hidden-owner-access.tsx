"use client";

import { useEffect, useState } from "react";
import { OwnerAccessForm } from "./owner-access-form";

export function HiddenOwnerAccess() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (revealed) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest(".ks-auth-showcase")) {
        setRevealed(true);
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [revealed]);

  return revealed ? <OwnerAccessForm /> : null;
}
