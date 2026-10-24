"use client";

import { useState, type DragEvent } from "react";

/**
 * Drag a file from a folder onto a box. The box gets `is-dropping` while a file is over it; a dropped file that does not match the
 * picker's `accept` list (extensions or MIME types, the same string the real input uses) is refused with a short message, not sent.
 */
export function fileMatchesAccept(file: File, accept: string): boolean {
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.startsWith(".")) return name.endsWith(rule);
    if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
    return type === rule;
  });
}

export function useFileDrop({
  accept,
  disabled,
  onFile,
  onRefuse = (message) => window.alert(message)
}: {
  accept: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  onRefuse?: (message: string) => void;
}) {
  const [over, setOver] = useState(false);
  const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  return {
    dropping: over,
    dropProps: {
      onDragOver: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setOver(true);
      },
      onDragLeave: (e: DragEvent) => {
        // Moving over a child element fires leave on the parent; only clear when the pointer really left the box.
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        if (disabled || !hasFiles(e)) return;
        e.preventDefault();
        setOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        if (files.length > 1) {
          onRefuse("Seret satu fail sahaja.");
          return;
        }
        if (!fileMatchesAccept(files[0], accept)) {
          onRefuse("Jenis fail ini tidak diterima di sini.");
          return;
        }
        onFile(files[0]);
      }
    }
  };
}
