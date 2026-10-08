"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Ground {
  key: string;
  label: string;
  hex: string;
  tone: "light" | "dark";
}
interface Block {
  key: string;
  label: string;
  default: string;
  current: string;
}

/** Tetapan: the background of each block of the home page, picked from the Jalin theme colours (no free colour). A change shows on the public page at once. */
export default function SiteThemeSettings() {
  const [grounds, setGrounds] = useState<Ground[] | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [note, setNote] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-theme");
    if (!res.ok) return setNote({ text: "Warna blok laman utama tidak dapat dimuatkan.", failed: true });
    const data = (await res.json()) as { grounds: Ground[]; blocks: Block[] };
    setGrounds(data.grounds);
    setBlocks(data.blocks);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pick(block: Block, ground: Ground) {
    if (ground.key === block.current || busy) return;
    setNote({ text: "Menyimpan…", failed: false });
    setBusy(block.key);
    const res = await fetch("/api/admin/site-theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block: block.key, ground: ground.key })
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      const text = `Warna blok ${block.label} tidak dapat disimpan: ${data.error || "ralat tidak diketahui"}`;
      setNote({ text, failed: true });
      toast(text, "error");
      return;
    }
    const text = `Warna blok ${block.label} disimpan: ${ground.label}. Sudah kelihatan di laman awam.`;
    setNote({ text, failed: false });
    toast(text, "success");
    load();
  }

  if (!grounds) return <p className="admin-form-hint" role={note?.failed ? "alert" : undefined}>{note?.text ?? "Memuatkan…"}</p>;

  return (
    <>
      <p className="admin-form-hint">
        Pilih warna latar bagi setiap blok laman utama. Hanya warna tema Jalin ditawarkan; teks dalam blok bertukar cerah atau gelap sendiri supaya kekal
        boleh dibaca. Memilih sesuatu warna terus menyimpannya, dan perubahan kelihatan pada laman awam serta-merta. Kepala dan kaki halaman tidak berubah.
      </p>
      {/* The result sits above the list, where the editor is looking, not under the last block. */}
      <p className={`a-save-status${note?.failed ? " is-bad" : ""}`} role={note?.failed ? "alert" : "status"}>{note?.text ?? ""}</p>
      <div className="a-ground-list">
        {blocks.map((block) => (
          <fieldset className="a-ground-row" key={block.key} disabled={busy === block.key}>
            <legend>{block.label}</legend>
            <div className="a-ground-swatches" role="radiogroup" aria-label={`Warna latar ${block.label}`}>
              {grounds.map((ground) => {
                const selected = ground.key === block.current;
                return (
                  <button
                    key={ground.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`a-ground-swatch${selected ? " is-selected" : ""}`}
                    onClick={() => pick(block, ground)}
                    title={ground.label}
                  >
                    <span className="a-ground-chip" style={{ background: ground.hex }} aria-hidden="true" />
                    <span>{ground.label}{ground.key === block.default ? " (asal)" : ""}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}
