"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Field {
  field: string;
  saved: string;
  default: string;
}

export type PageCopyGroup = {
  title: string;
  hint?: string;
  fields: { field: string; label: string; long?: boolean }[];
};

const MAX = 1200;

/**
 * Tetapan: the words of one public page, a text box for each field. A field left empty (or set back to its default text) means the
 * default. Saved with the Simpan button. `before` is shown above the fields and gets the page's saved extras (a picture) through `render`.
 */
export default function PageCopyForm({
  endpoint,
  groups,
  render,
  after,
  savedMessage
}: {
  endpoint: string;
  groups: PageCopyGroup[];
  render?: (extras: { hero: { src: string; alt: string } }, reload: () => Promise<void>) => ReactNode;
  after?: ReactNode;
  savedMessage: string;
}) {
  const [fields, setFields] = useState<Field[] | null>(null);
  const [hero, setHero] = useState({ src: "", alt: "" });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ text: string; failed: boolean } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(endpoint);
    if (!res.ok) return setStatus({ text: "Teks halaman tidak dapat dimuatkan.", failed: true });
    const data = (await res.json()) as { fields: Field[]; hero: { src: string; alt: string } };
    setFields(data.fields);
    setHero(data.hero);
    setValues(Object.fromEntries(data.fields.map((f) => [f.field, f.saved || f.default])));
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!fields) return <p className="admin-form-hint" role={status?.failed ? "alert" : undefined}>{status?.text ?? "Memuatkan…"}</p>;

  const changed = fields.filter((f) => (values[f.field] ?? "").trim() !== (f.saved || f.default));

  async function save() {
    if (busy || changed.length === 0) return;
    setBusy(true);
    setStatus({ text: "Menyimpan…", failed: false });
    const body = Object.fromEntries(changed.map((f) => [f.field, (values[f.field] ?? "").trim()]));
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: body }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setStatus({ text: data.error || "Teks halaman tidak dapat disimpan.", failed: true });
    await load();
    setStatus(null);
    toast(savedMessage, "success");
  }

  return (
    <div className="admin-form">
      {render ? render({ hero }, load) : null}

      {groups.map((group) => (
        <section className="admin-section" key={group.title} aria-label={group.title}>
          <h2 className="admin-form-section-title">{group.title}</h2>
          {group.hint ? <p className="admin-form-hint">{group.hint}</p> : null}
          {group.fields.map((item) => (
            <div className="admin-form-group" key={item.field}>
              <label htmlFor={`pc-${item.field}`}>{item.label}</label>
              {item.long ? (
                <textarea id={`pc-${item.field}`} className="admin-textarea" rows={5} maxLength={MAX} value={values[item.field] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [item.field]: e.target.value }))} />
              ) : (
                <input id={`pc-${item.field}`} type="text" maxLength={120} value={values[item.field] ?? ""} onChange={(e) => setValues((p) => ({ ...p, [item.field]: e.target.value }))} />
              )}
            </div>
          ))}
        </section>
      ))}

      {after}

      {status ? <p className="admin-form-hint" role={status.failed ? "alert" : "status"}>{status.text}</p> : null}
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary" disabled={busy || changed.length === 0} onClick={() => void save()}>
          {busy ? "Menyimpan…" : "Simpan teks"}
        </button>
      </div>
    </div>
  );
}
