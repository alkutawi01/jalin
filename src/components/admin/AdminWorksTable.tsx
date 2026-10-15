"use client";

import { useEffect, useMemo, useState } from "react";
import { confirmAction, toast } from "../../lib/admin/dialogs";
import { errorText } from "../../lib/admin/error-text";

export interface AdminWorkRow {
  id: string; title: string; slug: string; type: string; status: string;
  version: string; updatedAt: string | null; authors: string;
  readiness?: { ready: boolean; firstTab?: string; firstBlocker?: string | null };
}

interface PickWork {
  id: string; title: string; type: string; slug: string;
  rank: number | null; reason: string;
}

const LIMIT = 3;
const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
const STATUS_LABELS: Record<string, string> = { draft: "Draf", review: "Semakan", ready: "Sedia", published: "Diterbitkan", archived: "Arkib" };

/** A long value cut to one line: the full text is the tooltip, and a click copies it. */
function CopyChip({ value, label }: { value: string; label: string }) {
  async function copy() {
    let done = false;
    try {
      await navigator.clipboard.writeText(value);
      done = true;
    } catch {
      // A page without clipboard permission: the select-and-copy way.
      const box = document.createElement("textarea");
      box.value = value;
      box.setAttribute("readonly", "");
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      try { done = document.execCommand("copy"); } catch { done = false; }
      box.remove();
    }
    toast(done ? `${label} disalin: ${value}` : `${label} tidak dapat disalin. Pilih teksnya dan salin sendiri.`, done ? "success" : "error");
  }
  return (
    <button type="button" className="a-copy" title={`${value} (klik untuk salin)`} aria-label={`Salin ${label}: ${value}`} onClick={() => void copy()}>
      {value}
    </button>
  );
}

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const selectedRows = works.filter((work) => selected.has(work.id));
  const toArchive = selectedRows.filter((work) => work.status !== "archived");
  const toRestore = selectedRows.filter((work) => work.status === "archived");
  const allSelected = works.length > 0 && selected.size === works.length;
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

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(works.map((work) => work.id)));
  }

  async function runBulk(action: "archive" | "restore") {
    const rows = action === "archive" ? toArchive : toRestore;
    if (rows.length === 0 || bulkBusy) return;
    const names = rows.slice(0, 6).map((work) => work.title).join(", ") + (rows.length > 6 ? `, dan ${rows.length - 6} lagi` : "");
    const published = rows.filter((work) => work.status === "published").length;
    const message = action === "archive"
      ? `Arkibkan ${rows.length} karya? ${published > 0 ? `${published} daripadanya sedang diterbitkan dan tidak lagi kelihatan kepada pembaca. ` : ""}Teks dikekalkan dan boleh dipulihkan. (${names})`
      : `Pulihkan ${rows.length} karya sebagai draf? Ia tidak diterbitkan semula secara automatik. (${names})`;
    if (!(await confirmAction(message, { danger: action === "archive", confirmLabel: action === "archive" ? "Ya, arkibkan" : "Ya, pulihkan" }))) return;
    setBulkBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/works/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: rows.map((work) => work.id), action })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Tindakan pukal gagal.");
      const changed = Array.isArray(data.changed) ? data.changed.length : 0;
      const skipped = Array.isArray(data.skipped) ? data.skipped : [];
      toast(`${changed} karya ${action === "archive" ? "diarkibkan" : "dipulihkan sebagai draf"}.${skipped.length ? ` ${skipped.length} tidak diubah: ${skipped.slice(0, 3).map((s: { title: string; reason: string }) => `${s.title} (${s.reason})`).join("; ")}` : ""}`, skipped.length ? "error" : "success");
      setSelected(new Set());
      window.location.reload();
    } catch (caught) {
      setError(errorText(caught, "Tindakan pukal gagal."));
    } finally {
      setBulkBusy(false);
    }
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
      setError(errorText(caught, "Pilihan Editor gagal disimpan."));
    } finally {
      setSaving(false);
    }
  }

  const positions = new Map(draft.map((work, index) => [work.id, index + 1]));

  return (
    <>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      <p className="admin-form-hint admin-pick-summary">
        Gambar utama laman utama: {saved.length}/{LIMIT} pilihan disimpan. Karusel bertukar secara automatik apabila sekurang-kurangnya dua karya disimpan.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table admin-works-table a-compact-table">
          <thead><tr><th className="a-col-fit"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua karya dalam senarai" /></th><th className="admin-pick-column" title="Pilihan Editor">Pilihan</th><th>Tajuk</th><th className="a-col-fit a-col-minor">ID</th><th className="a-col-wide">Pengarang</th><th className="a-col-wide">Alamat pautan</th><th>Jenis</th><th>Status</th><th className="a-col-wide">Versi</th><th className="a-col-fit a-col-minor">Dikemas kini</th><th>Tindakan</th></tr></thead>
          <tbody>
            {works.length === 0 ? (
              <tr><td colSpan={11} className="admin-table-empty">Tiada karya yang sepadan. Kosongkan carian atau pilih status lain.</td></tr>
            ) : works.map((work) => {
              const position = positions.get(work.id);
              const disabled = work.status !== "published";
              return (
                <tr key={work.id} className={selected.has(work.id) ? "is-selected" : undefined}>
                  <td className="a-col-fit admin-selection-cell"><input type="checkbox" checked={selected.has(work.id)} onChange={() => toggleSelected(work.id)} aria-label={`Pilih ${work.title}`} /></td>
                  <td className="admin-pick-cell">
                    <label className={`admin-pick-toggle${disabled ? " is-disabled" : ""}`} title={disabled ? "Hanya karya yang sudah diterbitkan boleh dipilih." : undefined}>
                      <input type="checkbox" checked={Boolean(position)} disabled={disabled} onChange={() => toggle(work)} aria-label={`${position ? "Keluarkan" : "Tambah"} ${work.title} ${position ? "daripada" : "ke"} Pilihan Editor`} />
                      <span aria-hidden="true">{position ?? ""}</span>
                    </label>
                  </td>
                  <td className="admin-table-title a-cell-clip" title={[work.title, work.authors, work.slug, work.version].filter(Boolean).join(" · ")}><a href={`/admin/works/${work.id}`} className="a-work-title-link">{work.title}</a></td>
                  <td className="a-col-fit a-col-minor"><CopyChip value={work.id} label="ID" /></td>
                  <td className="a-col-wide a-cell-clip" title={work.authors || undefined}>{work.authors || "—"}</td>
                  <td className="a-col-wide"><CopyChip value={work.slug} label="Alamat pautan" /></td>
                  <td>{TYPE_LABELS[work.type] ?? work.type}</td>
                  <td title={work.status === "ready" && work.readiness?.ready === false ? `Disekat: ${work.readiness.firstBlocker ?? ""}` : undefined}><span className={`admin-status admin-status-${work.status}`}>{STATUS_LABELS[work.status] ?? work.status}</span>{work.status === "ready" && work.readiness?.ready === false ? <a href={`/admin/works/${work.id}#${work.readiness.firstTab ?? "content"}`} className="admin-form-hint admin-work-blocker" title={work.readiness.firstBlocker ?? undefined}>Disekat: {work.readiness.firstBlocker}</a> : null}</td>
                  <td className="a-col-wide">{work.version}</td><td className="a-col-fit a-col-minor">{formatDate(work.updatedAt)}</td>
                  <td><div className="admin-table-actions"><a href={`/admin/works/${work.id}`} className="admin-btn admin-btn-sm">Sunting</a><a href={`/pratonton/${work.id}`} className="admin-btn admin-btn-sm admin-btn-outline">Pratonton</a></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {selected.size > 0 ? (
        <div className="admin-pick-savebar" role="region" aria-label="Tindakan pukal">
          <div><strong>{selected.size} karya dipilih</strong><span role="status">{toArchive.length > 0 ? `${toArchive.length} boleh diarkibkan` : ""}{toArchive.length > 0 && toRestore.length > 0 ? ", " : ""}{toRestore.length > 0 ? `${toRestore.length} boleh dipulihkan sebagai draf` : ""}</span></div>
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-outline" onClick={() => setSelected(new Set())} disabled={bulkBusy}>Batal pilihan</button>
            <button type="button" className="admin-btn admin-btn-outline" onClick={() => void runBulk("restore")} disabled={bulkBusy || toRestore.length === 0}>Pulihkan sebagai draf</button>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => void runBulk("archive")} disabled={bulkBusy || toArchive.length === 0}>{bulkBusy ? "Memproses…" : "Arkibkan terpilih"}</button>
          </div>
        </div>
      ) : null}
      {dirty ? <div className="admin-pick-savebar" role="region" aria-label="Perubahan Pilihan Editor"><div><strong>{draft.length}/{LIMIT} karya dipilih</strong><span role="status">{notice || "Ada perubahan belum disimpan."}</span></div><div className="admin-form-actions"><button type="button" className="admin-btn admin-btn-outline" onClick={cancel} disabled={saving}>Batal</button><button type="button" className="admin-btn admin-btn-primary" onClick={() => void save()} disabled={saving}>{saving ? "Menyimpan…" : "Simpan Pilihan Editor"}</button></div></div> : notice ? <p className="admin-form-hint" role="status">{notice}</p> : null}
    </>
  );
}
