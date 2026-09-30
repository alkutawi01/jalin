"use client";

import { useCallback, useEffect, useState } from "react";

interface Persona {
  ai: string;
  slug: string | null;
  displayName: string | null;
}

/** Tetapan: type the pseudonym each AI writes under. The credit form then offers the AI by name. */
export default function AiPersonaSettings() {
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [newAi, setNewAi] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/ai-personas");
    if (!res.ok) return setNote("Gagal memuatkan senarai AI.");
    const data = await res.json();
    setPersonas(data.personas);
    setNames(Object.fromEntries((data.personas as Persona[]).map((p) => [p.ai, p.displayName ?? ""])));
    setExisting((data.contributors as { displayName: string }[]).map((c) => c.displayName));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(ai: string) {
    const original = personas?.find((p) => p.ai === ai)?.displayName ?? "";
    const name = (names[ai] ?? "").trim();
    if (name === original) return;
    setNote(null);
    const res = await fetch("/api/admin/ai-personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai, name })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setNote(data.error || "Gagal menyimpan.");
    setNote(name ? `${ai} kini menulis sebagai ${name}.` : `Nama samaran ${ai} dikosongkan.`);
    load();
  }

  if (!personas) return <p className="admin-form-hint">Memuatkan…</p>;

  return (
    <>
      <p className="admin-form-hint">
        Taip nama samaran setiap AI, kemudian tekan Enter atau klik di luar kotak. Pada borang kredit, editor hanya memilih AI
        (contoh: Claude) dan nama samarannya keluar sendiri.
      </p>
      <datalist id="ai-persona-names">
        {existing.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <table className="admin-table">
        <tbody>
          {personas.map((p) => (
            <tr key={p.ai}>
              <td style={{ width: "35%" }}>
                <strong>{p.ai}</strong>
              </td>
              <td>
                <input
                  list="ai-persona-names"
                  aria-label={`Nama samaran ${p.ai}`}
                  placeholder="Nama samaran, cth. Nara Zahin"
                  value={names[p.ai] ?? ""}
                  onChange={(e) => setNames({ ...names, [p.ai]: e.target.value })}
                  onBlur={() => save(p.ai)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          style={{ flex: 1 }}
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
      {note ? <p className="admin-form-hint">{note}</p> : null}
    </>
  );
}
