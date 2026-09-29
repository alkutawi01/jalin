"use client";

import { useCallback, useEffect, useState } from "react";
import CopyButton from "./CopyButton";

interface ImageRequest {
  id: number;
  role: string;
  aspectRatio: string | null;
  altText: string | null;
  anchorStart: string | null;
  status: string;
  image: string | null;
  finalPrompt: string;
}

const STATUS: Record<string, string> = {
  draft: "Belum ada imej",
  pending: "Menunggu",
  queued: "Dalam barisan",
  generating: "Sedang dijana",
  generated: "Dijana, perlu semakan",
  failed: "Gagal",
  under_review: "Menunggu kelulusan anda",
  approved: "Diluluskan",
  rejected: "Ditolak",
  attached: "Dipaut pada karya"
};

async function post(url: string, init?: RequestInit) {
  const res = await fetch(url, { method: "POST", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal.");
  return data;
}

function Card({ item, reload }: { item: ImageRequest; reload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(label);
    setError(null);
    setNote(null);
    try {
      const message = await fn();
      if (message) setNote(message);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setBusy(null);
    }
  }

  const hasImage = Boolean(item.image);
  const done = item.status === "attached";

  return (
    <div className="admin-section">
      <strong>{item.role === "hero" ? "Hero" : "Inline"}</strong> · {item.aspectRatio ?? "3:2"} ·{" "}
      <span className={`admin-status admin-status-${item.status}`}>{STATUS[item.status] ?? item.status}</span>
      {item.anchorStart ? <p className="admin-form-hint">Selepas: “{item.anchorStart}…”</p> : null}
      <p className="admin-form-hint">Alt: {item.altText || "belum ada (wajib)"}</p>
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.image!} alt={item.altText ?? ""} style={{ maxWidth: 240, borderRadius: 6 }} />
      ) : null}

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {note ? <div className="admin-alert admin-alert-success">{note}</div> : null}

      {!done ? (
        <div className="admin-form-actions">
          <CopyButton text={item.finalPrompt} label="Salin arahan gambar" />
          <label className="admin-btn admin-btn-outline admin-btn-sm" style={{ cursor: "pointer" }}>
            {busy === "upload" ? "Memuat naik…" : "Muat naik imej"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              disabled={busy !== null}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                run("upload", async () => {
                  const body = new FormData();
                  body.append("file", file);
                  await post(`/api/admin/visual-requests/${item.id}/upload`, { body });
                  return "Imej dimuat naik. Semak, kemudian tekan Luluskan dan pautkan.";
                });
              }}
            />
          </label>
          <button
            type="button"
            className="admin-btn admin-btn-outline admin-btn-sm"
            disabled={busy !== null}
            onClick={() =>
              run("magnific", async () => {
                const data = await post(`/api/admin/visual-requests/${item.id}/generate`, {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ provider: "magnific" })
                });
                return data.pendingTask
                  ? "Tugas dihantar kepada Magnific. Muat semula sebentar lagi."
                  : `Selesai, status: ${data.status}.`;
              })
            }
          >
            {busy === "magnific" ? "Menghantar…" : "Jana dengan Magnific"}
          </button>
          {hasImage ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={busy !== null || !item.altText}
              title={item.altText ? "" : "Alt text diperlukan"}
              onClick={() =>
                run("attach", async () => {
                  if (item.status !== "approved") await post(`/api/admin/visual-requests/${item.id}/approve`);
                  await post(`/api/admin/visual-requests/${item.id}/attach`);
                  return "Imej diluluskan dan dipautkan. Karya belum diterbitkan.";
                })
              }
            >
              {busy === "attach" ? "Memautkan…" : "Luluskan dan pautkan"}
            </button>
          ) : null}
          <a href={`/admin/visual-requests/${item.id}`} className="admin-btn admin-btn-sm">
            Butiran
          </a>
        </div>
      ) : null}
    </div>
  );
}

export default function WorkImagesPanel({ workId, onChanged }: { workId: string; onChanged?: () => void }) {
  const [items, setItems] = useState<ImageRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/works/${workId}/image-requests`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat gambar.");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }, [workId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="admin-alert admin-alert-error">{error}</div>;
  if (!items) return <p className="admin-form-hint">Memuatkan…</p>;
  if (items.length === 0) return null;

  return (
    <section style={{ marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 8px" }}>Gambar untuk karya ini ({items.length})</h3>
      <p className="admin-form-hint">
        Untuk setiap gambar: salin arahan ke penjana imej pilihan anda, kemudian muat naik hasilnya, atau tekan Jana dengan
        Magnific. Selepas itu luluskan dan pautkan.
      </p>
      {items.map((item) => (
        <Card
          key={item.id}
          item={item}
          reload={() => {
            load();
            onChanged?.();
          }}
        />
      ))}
    </section>
  );
}
