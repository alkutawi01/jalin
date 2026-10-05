"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AUDIENCE_BANDS, audienceCodes, audienceValue, bandRangeLabel, type AudienceBand } from "../../lib/audience";

/**
 * "Audiens": who a work is for, ticked from the bands set in Tetapan (a work can be for more than one). `value` is the stored text
 * (codes, or an older value such as "13-17", which shows as the bands it covers); `onChange` gives the new stored text.
 */
export default function AudiencePicker({ id = "audience", value, onChange }: { id?: string; value: string; onChange: (next: string) => void }) {
  const [bands, setBands] = useState<AudienceBand[]>(DEFAULT_AUDIENCE_BANDS);

  useEffect(() => {
    fetch("/api/admin/audience-bands")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.bands) && data.bands.length > 0) setBands(data.bands);
      })
      .catch(() => {});
  }, []);

  const chosen = audienceCodes(value, bands);
  const unknown = value.trim() !== "" && chosen.length === 0;

  function toggle(code: string, on: boolean) {
    onChange(audienceValue(on ? [...chosen, code] : chosen.filter((c) => c !== code), bands));
  }

  return (
    <fieldset className="a-audience" id={id}>
      <legend>Audiens</legend>
      <div className="a-audience-options">
        {bands.map((band) => (
          <label key={band.code} className="admin-checkbox-label">
            <input type="checkbox" checked={chosen.includes(band.code)} onChange={(e) => toggle(band.code, e.target.checked)} />
            {band.label} <span className="a-audience-range">{bandRangeLabel(band)} tahun</span>
          </label>
        ))}
      </div>
      {unknown ? <p className="admin-form-hint">Nilai lama &quot;{value}&quot; tidak sepadan dengan mana-mana peringkat. Tanda peringkat yang betul untuk menggantikannya.</p> : null}
    </fieldset>
  );
}
