"use client";

import { useState, type Ref } from "react";

/**
 * The browser's own file box says "Choose File / No file chosen" in the browser's language, which on a Malay admin is English
 * (found in the editor simulation, Oct 2026). This is the same control in Malay: the real input stays (drawn as nothing over the button, so keyboard and
 * screen readers still work through the button), the button opens it, and the name of the chosen file sits beside it.
 */
export default function FilePicker({
  id,
  accept,
  disabled,
  onFile,
  inputRef,
  selectedName,
  clearAfterPick,
  label = "Pilih fail"
}: {
  id?: string;
  accept: string;
  disabled?: boolean;
  onFile: (file: File | null) => void;
  inputRef?: Ref<HTMLInputElement>;
  /** Pass the name when the page keeps the file itself (and clears it after sending); otherwise the picker remembers it. */
  selectedName?: string | null;
  clearAfterPick?: boolean;
  label?: string;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const name = selectedName !== undefined ? selectedName : own;
  return (
    <span className="a-file-picker">
      <label className={`admin-btn admin-btn-sm${disabled ? " is-disabled" : ""}`}>
        {label}
        <input
          id={id}
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setOwn(file ? file.name : null);
            onFile(file);
            // A picker that sends the file at once forgets it, so the same file can be chosen again.
            if (clearAfterPick) e.target.value = "";
          }}
        />
      </label>
      <span className="a-file-picker-name" aria-live="polite">{name || "Tiada fail dipilih"}</span>
    </span>
  );
}
