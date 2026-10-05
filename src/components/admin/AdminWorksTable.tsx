"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

export interface AdminWorkRow {
  id: string; title: string; slug: string; type: string; status: string;
  version: string; updatedAt: string | null; authors: string;
  readiness?: { ready: boolean; firstTab?: string; firstBlocker?: string };
}

interface PickWork {
  id: string; title: string; type: string; slug: string;
  rank: number | null; reason: string;
}

const LIMIT = 3;
const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
const STATUS_LABELS: Record<string, string> = { draft: "Draf", review: "Semakan", ready: "Sedia", published: "Diterbitkan", archived: "Arkib" };

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ms-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminWorksTable({ works, initialPicks }: { works: AdminWorkRow[]; initialPicks: PickWork[] }) {
  const initial = initialPicks.slice(0, LIMIT);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = useMemo(() => saved.map((work) => work.id).join("|") !== draft.map((work) => work.id).join("|"), [saved, draft]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function toggle(work: AdminWorkRow) {
    if (work.status !== "published") return;
    setError("");
    setDraft((current) => {
      if (current.some((item) => item.id === work.id)) {
        setNotice(`${work.title} akan dikeluarkan daripada Pilihan Editor.`);
        return current.filter((item) => item.id !== work.id);
      }
      const next: PickWork = { id: work.id, title: work.title, type: work.type, slug: work.slug, rank: null, reason: "" };
      if (current.length < LIMIT) {
        setNotice(`${work.title} akan ditambah sebagai pilihan ${current.length + 1}.`);
        return [...current, next];
      }
      setNotice(`Had tiga karya. ${current[0].title} akan dikeluarkan dan ${work.title} akan menjadi pilihan ketiga.`);
      return [...current.slice(1), next];
    });
  }

  function cancel() {
    setDraft(saved);
    setError("");
    setNotice("Perubahan Pilihan Editor dibatalkan.");
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/editor-picks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: draft.map(({ id, reason }) => ({ id, reason })) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Pilihan Editor gagal disimpan.");
      const next = (data.picks as PickWork[]).slice(0, LIMIT);
      setSaved(next);
      setDraft(next);
      setNotice("");
      toast("Pilihan Editor disimpan. Laman utama dikemas kini.", "success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Pilihan Editor gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const positions = new Map(draft.map((work, index) => [work.id, index + 1]));

  return (
    <>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      <div className="admin-table-wrap">
        <table className="admin-table admin-works-table">
          <thead><tr><th className="admin-pick-column">Pilihan Editor</th><th>Tajuk</th><th>Alamat pautan</th><th>Jenis</th><th>Status</th><th>Versi</th><th>Dikemas kini</th><th>Aksi</th></tr></thead>
          <tbody>
            {works.length === 0 ? (
              <tr><td colSpan={8} className="admin-table-empty">Tiada karya yang sepadan. Kosongkan carian atau pilih status lain.</td></tr>
            ) : works.map((work) => {
              const position = positions.get(work.id);
              const disabled = work.status !== "published";
              return (
                <tr key={work.id}>
                  <td className="admin-pick-cell">
                    <label className={`admin-pick-toggle${disabled ? " is-disabled" : ""}`} title={disabled ? "Hanya karya yang sudah diterbitkan boleh dipilih." : undefined}>
                      <input type="checkbox" checked={Boolean(position)} disabled={disabled} onChange={() => toggle(work)} aria-label={`${position ? "Keluarkan" : "Tambah"} ${work.title} ${position ? "daripada" : "ke"} Pilihan Editor`} />
                      <span aria-hidden="true">{position ?? ""}</span>
                    </label>
                  </td>
                  <td className="admin-table-title"><a href={`/admin/works/${work.id}`} className="a-work-title-link">{work.title}</a><span className="admin-form-hint admin-work-byline">{work.id}{work.authors ? ` · ${work.authors}` : ""}</span></td>
                  <td><code>{work.slug}</code></td><td>{TYPE_LABELS[work.type] ?? work.type}</td>
                  <td><span className={`admin-status admin-status-${work.status}`}>{STATUS_LABELS[work.status] ?? work.status}</span>{work.status === "ready" && work.readiness?.ready === false ? <a href={`/admin/works/${work.id}#${work.readiness.firstTab ?? "content"}`} className="admin-form-hint admin-work-blocker" title={work.readiness.firstBlocker}>Disekat: {work.readiness.firstBlocker}</a> : null}</td>
                  <td>{work.version}</td><td>{formatDate(work.updatedAt)}</td>
                  <td><div className="admin-table-actions"><a href={`/admin/works/${work.id}`} className="admin-btn admin-btn-sm">Sunting</a><a href={`/pratonton/${work.id}`} className="admin-btn admin-btn-sm admin-btn-outline">Pratonton</a></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {dirty ? <div className="admin-pick-savebar" role="region" aria-label="Perubahan Pilihan Editor"><div><strong>{draft.length}/{LIMIT} karya dipilih</strong><span role="status">{notice || "Ada perubahan belum disimpan."}</span></div><div className="admin-form-actions"><button type="button" className="admin-btn admin-btn-outline" onClick={cancel} disabled={saving}>Batal</button><button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={saving}>{saving ? "Menyimpan…" : "Simpan Pilihan Editor"}</button></div></div> : notice ? <p className="admin-form-hint" role="status">{notice}</p> : null}
    </>
  );
}
