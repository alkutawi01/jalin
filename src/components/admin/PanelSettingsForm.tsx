"use client";

import { useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";
import { errorText } from "../../lib/admin/error-text";
import { useAdminCan } from "./AdminRole";
import { api, Notice } from "./langganan-ui";

/** The two things the chief editor can change. The rubric (components, weights, anchors) is shown, not edited: a change there is a new version. */
export default function PanelSettingsForm() {
  const canChange = useAdminCan("panel.settings");
  const [form, setForm] = useState({ threshold: "", referenceName: "", referenceKeywords: "" });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ threshold: string; referenceName: string; referenceKeywords: string }>("/api/admin/panel/settings", "GET")
      .then((s) => { setForm(s); setLoaded(true); })
      .catch((e) => setError(errorText(e, "Tetapan tidak dapat dimuatkan.")));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const s = await api<{ threshold: string; referenceName: string; referenceKeywords: string }>("/api/admin/panel/settings", "PUT", form);
      setForm(s);
      toast("Tetapan disimpan.", "success");
    } catch (err) { setError(errorText(err, "Tidak berjaya.")); } finally { setBusy(false); }
  }

  if (!loaded && !error) return <p className="admin-form-hint">Memuatkan tetapan…</p>;
  return (
    <form className="admin-batch-form" onSubmit={save}>
      {error ? <Notice kind="error">{error}</Notice> : null}
      {!canChange ? <Notice kind="info">Hanya ketua editor boleh mengubah tetapan ini.</Notice> : null}
      <div className="admin-form-group">
        <label htmlFor="ps-threshold">Ambang skor</label>
        <input id="ps-threshold" value={form.threshold} onChange={(e) => setForm({ ...form, threshold: e.target.value })} disabled={!canChange || busy} inputMode="decimal" />
        <p className="admin-form-hint">Karya melepasi syarat skor hanya apabila min penilaian rasmi <strong>lebih daripada</strong> nombor ini; tepat sama tidak melepasi. Contoh: 8 atau 7.75. Mengubahnya mengubah status melepasi bagi semua karya serta-merta, tetapi tidak mengubah mana-mana skor.</p>
      </div>
      <div className="admin-form-group">
        <label htmlFor="ps-name">Nama penilai rasmi</label>
        <input id="ps-name" value={form.referenceName} onChange={(e) => setForm({ ...form, referenceName: e.target.value })} disabled={!canChange || busy} maxLength={40} />
        <p className="admin-form-hint">Nama yang dipaparkan kepada editor.</p>
      </div>
      <div className="admin-form-group">
        <label htmlFor="ps-keywords">Kata padanan nama model</label>
        <input id="ps-keywords" value={form.referenceKeywords} onChange={(e) => setForm({ ...form, referenceKeywords: e.target.value })} disabled={!canChange || busy} />
        <p className="admin-form-hint">Penilaian yang nama modelnya mengandungi salah satu kata ini (dipisahkan koma, contohnya <em>gpt, openai</em>) dikira dalam min. Model lain disimpan sebagai tambahan dan tidak dikira. Menukar penilai rasmi memerlukan penilaian baharu daripada model itu.</p>
      </div>
      {canChange ? <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan tetapan"}</button> : null}
    </form>
  );
}
