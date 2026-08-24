"use client";

import { useEffect } from "react";

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.matches("input, textarea, select") || target.isContentEditable);

export default function ContentProtection() {
  useEffect(() => {
    const preventCopy = (event: ClipboardEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    const preventContextMenu = (event: MouseEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };
    const preventDrag = (event: DragEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("dragstart", preventDrag);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("dragstart", preventDrag);
    };
  }, []);

  return null;
}
