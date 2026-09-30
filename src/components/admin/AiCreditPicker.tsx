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

  useEffect(() => {
    fetch("/api/admin/ai-personas")
      .then((res) => (res.ok ? res.json() : { personas: [] }))
      .then((data) => setPersonas((data.personas as Persona[]).filter((p) => p.slug)))
      .catch(() => setPersonas([]));
  }, []);

  if (personas.length === 0) {
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
          <option key={p.ai} value={p.ai}>
            {p.ai}
          </option>
        ))}
      </select>
      {picked ? <p className="admin-form-hint">Dipaparkan sebagai: {picked.displayName} (Maya)</p> : null}
    </div>
  );
}
