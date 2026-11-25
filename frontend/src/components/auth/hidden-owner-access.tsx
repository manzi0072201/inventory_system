"use client";

import { useEffect, useRef, useState } from "react";
import { OwnerAccessForm } from "./owner-access-form";

const ACCESS_PHRASE = "manzikb@007";

export function HiddenOwnerAccess() {
  const [revealed, setRevealed] = useState(false);
  const typed = useRef("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (revealed || event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      if (event.key === "Backspace") {
        typed.current = typed.current.slice(0, -1);
        return;
      }

      if (event.key.length !== 1) return;

      const key = event.key.toLowerCase();
      typed.current = `${typed.current}${key}`;

      if (!ACCESS_PHRASE.startsWith(typed.current)) {
        typed.current = key === ACCESS_PHRASE[0] ? key : "";
      }

      if (typed.current === ACCESS_PHRASE) {
        typed.current = "";
        setRevealed(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [revealed]);

  return revealed ? <OwnerAccessForm /> : null;
}
