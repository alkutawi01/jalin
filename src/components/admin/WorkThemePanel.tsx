"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { derivePalettes, normaliseHex, type StoryPalette, type StoryThemeSetting } from "../../lib/reader/story-theme";
import { errorText } from "../../lib/admin/error-text";

/**
 * The work's own colour (works.metadata.theme): none (the page follows the site), read from the hero picture, or chosen by the editor.
 * The page is tinted in the reader's own Cerah, Sepia or Gelap; the three small previews show what each reader will see. Saved at once
 * (like the picture upload), no need to press the work's own save button.
 */
type Choice = "none" | "auto" | "manual";

/** One preview card's colours as custom properties (the classes in admin.css read them); the colours are the work's, so they cannot live in the stylesheet. */
function previewVars(p: StoryPalette): CSSProperties {
  return { "--p-bg": p.bg, "--p-surface": p.surface, "--p-ink": p.ink, "--p-ink-soft": p.inkSoft, "--p-line": p.line, "--p-accent": p.accent, "--p-accent-text": p.accentText } as CSSProperties;
}

export default function WorkThemePanel({ workId, hasHero }: { workId: string; hasHero: boolean }) {
  const [saved, setSaved] = useState<StoryThemeSetting | null>(null);
  const [choice, setChoice] = useState<Choice>("none");
  const [color, setColor] = useState("#a76450");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/works/${encodeURIComponent(workId)}/theme`, { cache: "no-store" });
      const data = (await res.json()) as { theme: StoryThemeSetting | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Warna karya tidak dapat dibaca.");
      setSaved(data.theme);
      setChoice(data.theme ? data.theme.mode : "none");
      if (data.theme) setColor(data.theme.color);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoaded(true);
    }
  }, [workId]);

  useEffect(() => { void load(); }, [load]);

  async function save(next: Choice) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const hex = normaliseHex(color);
      if (next === "manual" && !hex) throw new Error("Warna tidak sah. Gunakan format #rrggbb.");
      const res = await fetch(`/api/admin/works/${encodeURIComponent(workId)}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next === "manual" ? { mode: "manual", color: hex } : { mode: next })
      });
      const data = (await res.json()) as { theme: StoryThemeSetting | null; error?: string };
      if (!res.ok) throw new Error(data.error || "Warna karya tidak dapat disimpan.");
      setSaved(data.theme);
      setChoice(data.theme ? data.theme.mode : "none");
      if (data.theme) setColor(data.theme.color);
      setNote(next === "none" ? "Warna karya dibuang. Halaman mengikut tema tapak." : next === "auto" ? "Warna dibaca daripada gambar utama dan disimpan." : "Warna disimpan.");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const preview = normaliseHex(color);
  const palettes = preview ? derivePalettes(preview) : null;

  return (
    <div className="admin-credit-form a-theme-panel">
      <h4 className="a-theme-title">Warna tema karya</h4>
      <p className="admin-form-hint">
        Beri halaman karya ini warna sendiri supaya pembaca tidak bosan. Latar halaman, tajuk, pautan dan butang mengikut warna ini. Pembaca yang memilih tema Gelap atau Sepia tetap
        mendapat halaman gelap atau sepia, hanya diwarnai dengan warna karya. Teks sentiasa dikekalkan mudah dibaca.
      </p>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      {note ? <div className="admin-alert admin-alert-success" role="status">{note}</div> : null}
      {!loaded ? <p className="admin-form-hint">Memuatkan…</p> : (
        <>
          <div className="a-theme-choices" role="radiogroup" aria-label="Sumber warna karya">
            <label><input type="radio" name={`theme-${workId}`} checked={choice === "none"} onChange={() => setChoice("none")} /> Tiada (ikut tema tapak)</label>
            <label><input type="radio" name={`theme-${workId}`} checked={choice === "auto"} disabled={!hasHero} onChange={() => setChoice("auto")} /> Automatik daripada gambar utama{hasHero ? "" : " (belum ada gambar utama)"}</label>
            <label><input type="radio" name={`theme-${workId}`} checked={choice === "manual"} onChange={() => setChoice("manual")} /> Pilih warna sendiri</label>
          </div>

          {choice === "manual" ? (
            <div className="admin-form-row a-theme-row-end">
              <div className="admin-form-group">
                <label htmlFor="theme-color-pick">Warna</label>
                <input id="theme-color-pick" type="color" value={preview ?? "#a76450"} onChange={(e) => setColor(e.target.value)} className="a-theme-swatch-pick" />
              </div>
              <div className="admin-form-group">
                <label htmlFor="theme-color-hex">Kod warna (#rrggbb)</label>
                <input id="theme-color-hex" value={color} onChange={(e) => setColor(e.target.value)} maxLength={7} spellCheck={false} />
              </div>
            </div>
          ) : null}

          {choice === "auto" ? (
            <p className="admin-form-hint">
              {saved?.mode === "auto" ? "Warna terkini daripada gambar utama: " : "Tekan butang di bawah untuk membaca warna daripada gambar utama. "}
              {saved?.mode === "auto" ? <strong>{saved.color}</strong> : null}
              {saved?.mode === "auto" ? ". Jika gambar utama diganti, tekan butang itu sekali lagi untuk membaca warna baharu." : ""}
            </p>
          ) : null}

          {choice !== "none" && palettes ? (
            <div className="a-theme-previews" aria-label="Pratonton warna karya">
              {(["cerah", "sepia", "gelap"] as const).map((name) => {
                const p = palettes[name];
                return (
                  <div key={name} className="a-theme-preview" style={previewVars(p)}>
                    <span className="a-theme-preview-name">{name === "cerah" ? "Cerah" : name === "sepia" ? "Sepia" : "Gelap"}</span>
                    <span className="a-theme-preview-soft">Tajuk karya</span>
                    <span className="a-theme-preview-card">Kad dan petikan</span>
                    <span className="a-theme-preview-bar" />
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={busy || (choice === "auto" && !hasHero)} onClick={() => void save(choice)}>
              {busy ? "Menyimpan…" : choice === "none" ? "Simpan (tiada warna)" : choice === "auto" ? "Baca warna daripada gambar utama" : "Simpan warna"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
