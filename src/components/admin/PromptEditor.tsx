"use client";

import { useState } from "react";

interface Props {
  target: string;
  label: string;
  description?: string;
  initial: string;
  customised: boolean;
}

export default function PromptEditor({ target, label, description, initial, customised }: Props) {
  const [text, setText] = useState(initial);
  const [isCustom, setIsCustom] = useState(customised);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setNote(null);
    try {
      const response = await fetch("/api/admin/authoring/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, ...body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Gagal.");
      setNote(done);
      return true;
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Ralat.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="admin-section">
      <summary>
        <strong>{label}</strong> {isCustom ? "· disunting" : "· asal"}
      </summary>
      {description ? <p className="admin-form-hint">{description}</p> : null}
      <textarea className="admin-textarea" rows={14} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          disabled={busy || text.trim() === initial.trim()}
          onClick={async () => {
            if (await send({ text }, "Disimpan. Digunakan untuk arahan seterusnya.")) setIsCustom(true);
          }}
        >
          Simpan
        </button>
        {isCustom ? (
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            disabled={busy}
            onClick={async () => {
              if (await send({ reset: true }, "Dikembalikan kepada teks asal. Muat semula halaman untuk melihatnya.")) setIsCustom(false);
            }}
          >
            Kembalikan teks asal
          </button>
        ) : null}
      </div>
      {note ? <p className="admin-form-hint">{note}</p> : null}
    </details>
  );
}
