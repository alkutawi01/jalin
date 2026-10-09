"use client";

import { useId, useState } from "react";
import { cleanFootnoteText } from "../../lib/admin/footnote-insert";

/**
 * The box for a side note: the editor types the note's words, and the manuscript editor puts the number at the cursor and the note at the
 * end (lib/admin/footnote-insert.ts), so nobody has to type "[^1]".
 *
 * Beside the Markdown box it brings its own "+ Nota sisi" button. In the visual editor the button is an icon in the toolbar like the
 * others (the editor owns `open`), and this draws only the box.
 */
export default function FootnoteInserter({
  onInsert,
  open: controlledOpen,
  onOpenChange
}: {
  onInsert: (text: string) => boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const [text, setText] = useState("");
  const id = useId();
  const controlled = controlledOpen !== undefined;
  const open = controlled ? controlledOpen : ownOpen;

  function setOpen(value: boolean) {
    if (!controlled) setOwnOpen(value);
    onOpenChange?.(value);
  }
  function close() {
    setOpen(false);
    setText("");
  }

  if (!open) {
    if (controlled) return null;
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
