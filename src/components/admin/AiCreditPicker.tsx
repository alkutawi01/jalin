"use client";

import { useEffect, useState } from "react";

interface Persona {
  ai: string;
  slug: string | null;
  displayName: string | null;
}

/**
 * On the credit form: pick the AI (e.g. Claude) and its pseudonym is filled in.
 * The pseudonyms are set once in Tetapan.
 */
export default function AiCreditPicker({
  currentSlug,
  onPick
}: {
  currentSlug: string | undefined;
  onPick: (slug: string) => void;
}) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-personas")
      .then((res) => (res.ok ? res.json() : { personas: [] }))
      .then((data) => setPersonas(data.personas as Persona[]))
      .catch(() => setPersonas([]))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;
  const ready = personas.filter((p) => p.slug);
  if (ready.length === 0) {
    return (
      <p className="admin-form-hint">
        Untuk memilih kredit mengikut AI (contoh: Claude), tetapkan nama samaran setiap AI di <a href="/admin/settings">Tetapan</a>.
      </p>
    );
  }

  const picked = personas.find((p) => p.slug === currentSlug);
  return (
    <div className="admin-form-group">
      <label>Kredit kepada AI</label>
      <select value={picked?.ai ?? ""} onChange={(e) => {
        const persona = personas.find((p) => p.ai === e.target.value);
        if (persona?.slug) onPick(persona.slug);
      }}>
        <option value="">-- Pilih AI --</option>
        {personas.map((p) => (
          // An AI with no pseudonym yet is still listed (it used to vanish, so the editor could not tell why Gemini was missing).
          <option key={p.ai} value={p.ai} disabled={!p.slug}>
            {p.slug ? p.ai : `${p.ai} (belum ada nama samaran)`}
          </option>
        ))}
      </select>
      {personas.some((p) => !p.slug) ? (
        <p className="admin-form-hint">AI yang belum ada nama samaran tidak boleh dipilih lagi: tetapkan namanya di <a href="/admin/settings#nama-samaran">Tetapan</a>, kemudian muat semula halaman ini.</p>
      ) : null}
      {picked ? <p className="admin-form-hint">Dipaparkan sebagai: {picked.displayName} (Maya)</p> : null}
    </div>
  );
}
