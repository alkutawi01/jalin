"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "../../lib/admin/dialogs";

interface Persona {
  ai: string;
  slug: string | null;
  displayName: string | null;
}

/** Tetapan: type the pseudonym each AI writes under. The credit form then offers the AI by name. Saved with the Simpan button. */
export default function AiPersonaSettings() {
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<string[]>([]);
  const [status, setStatus] = useState<{ text: string; failed: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAi, setNewAi] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/ai-personas");
    if (!res.ok) return setStatus({ text: "Senarai AI tidak dapat dimuatkan.", failed: true });
    const data = await res.json();
    setPersonas(data.personas);
    setNames(Object.fromEntries((data.personas as Persona[]).map((p) => [p.ai, p.displayName ?? ""])));
    setExisting((data.contributors as { displayName: string }[]).map((c) => c.displayName));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!personas) return <p className="admin-form-hint" role={status?.failed ? "alert" : undefined}>{status?.text ?? "Memuatkan…"}</p>;

  const changed = personas.filter((p) => (names[p.ai] ?? "").trim() !== (p.displayName ?? ""));

  async function save() {
    if (busy || changed.length === 0) return;
    setBusy(true);
    setStatus({ text: "Menyimpan…", failed: false });
    const done: string[] = [];
    let problem: string | null = null;
    for (const p of changed) {
      const name = (names[p.ai] ?? "").trim();
      const res = await fetch("/api/admin/ai-personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai: p.ai, name })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        problem = `${p.ai}: ${data.error || "tidak dapat disimpan"}`;
        break;
      }
      done.push(name ? `${p.ai} → ${name}` : `${p.ai} (dikosongkan)`);
    }
    setBusy(false);
    if (done.length > 0) await load();
    if (problem) {
      const text = `Nama samaran tidak dapat disimpan sepenuhnya. ${done.length > 0 ? `Disimpan: ${done.join(", ")}. ` : ""}${problem}.`;
      setStatus({ text, failed: true });
      toast(text, "error");
      return;
    }
    const text = `Nama samaran disimpan: ${done.join(", ")}.`;
    setStatus({ text, failed: false });
    toast(text, "success");
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <p className="admin-form-hint">
        Taip nama samaran setiap AI, kemudian tekan Simpan. Pada borang kredit, editor hanya memilih AI
        (contoh: Claude) dan nama samarannya keluar sendiri.
      </p>
      <datalist id="ai-persona-names">
        {existing.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <table className="admin-table">
        <tbody>
          {personas.map((p) => {
            const isChanged = (names[p.ai] ?? "").trim() !== (p.displayName ?? "");
            return (
              <tr key={p.ai}>
                <td style={{ width: "35%" }}>
                  <strong>{p.ai}</strong>
                  {isChanged ? <span className="admin-form-hint">Belum disimpan</span> : null}
                </td>
                <td>
                  <input
                    list="ai-persona-names"
                    aria-label={`Nama samaran ${p.ai}`}
                    placeholder="Nama samaran, cth. Nara Zahin"
                    value={names[p.ai] ?? ""}
                    onChange={(e) => setNames({ ...names, [p.ai]: e.target.value })}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
          aria-label="Tambah AI lain"
          placeholder="Tambah AI lain, cth. Llama"
          value={newAi}
          onChange={(e) => setNewAi(e.target.value)}
        />
        <button
          type="button"
          className="admin-btn admin-btn-sm admin-btn-outline"
          disabled={!newAi.trim()}
          onClick={() => {
            const ai = newAi.trim();
            if (!personas.some((p) => p.ai === ai)) setPersonas([...personas, { ai, slug: null, displayName: null }]);
            setNewAi("");
          }}
        >
          + Tambah AI
        </button>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy || changed.length === 0}>{busy ? "Menyimpan…" : "Simpan"}</button>
        <span className="admin-form-hint" role={status?.failed ? "alert" : "status"}>
          {status ? status.text : changed.length > 0 ? `${changed.length} perubahan belum disimpan.` : "Tiada perubahan."}
        </span>
      </div>
    </form>
  );
}
