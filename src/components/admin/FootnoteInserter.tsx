"use client";

import { useId, useState } from "react";
import { cleanFootnoteText } from "../../lib/admin/footnote-insert";

/**
 * "+ Nota sisi": the editor types the note's words and the editor of the manuscript puts the number at the cursor and the note at the
 * end (lib/admin/footnote-insert.ts). Used beside the visual editor and the Markdown box, so nobody has to type "[^1]".
 */
export default function FootnoteInserter({ onInsert }: { onInsert: (text: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const id = useId();

  function close() {
    setOpen(false);
    setText("");
  }

  if (!open) {
    return (
      <div className="a-footnote-inserter">
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setOpen(true)}>+ Nota sisi</button>
      </div>
    );
  }
  return (
    <div className="a-footnote-inserter a-footnote-panel" role="group" aria-label="Sisip nota sisi" onKeyDown={(e) => e.key === "Escape" && close()}>
      <label htmlFor={id}>Isi nota sisi</label>
      <textarea id={id} className="admin-textarea" rows={3} maxLength={600} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="cth. Pasar malam itu ditutup pada tahun 2019." />
      <span className="admin-form-hint">Nombor nota diletakkan di tempat kursor tadi; pembaca melihat nota ini di sisi teks.</span>
      <div className="admin-form-actions">
        <button
          type="button"
          className="admin-btn admin-btn-primary admin-btn-sm"
          disabled={!cleanFootnoteText(text)}
          onClick={() => {
            if (onInsert(text)) close();
          }}
        >
          Sisip nota
        </button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={close}>Batal</button>
      </div>
    </div>
  );
}
