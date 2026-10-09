"use client";

import { useId, useMemo, useState } from "react";
import { confirmAction, toast } from "../../lib/admin/dialogs";
import { footnoteOverview, removeFootnote, setFootnoteText } from "../../lib/admin/footnote-edit";

/**
 * Every side note of the manuscript in one place, in the order (and with the numbers) a reader sees: read it, rewrite it, jump to where
 * its number is, or remove it (number and words together). Works on the manuscript text itself (lib/admin/footnote-edit.ts), so it is the
 * same in the visual editor and the Markdown box. Numbers with no note, and notes with no number, are shown so they can be put right.
 */
export default function SideNoteList({
  body,
  onChange,
  onJump
}: {
  body: string;
  onChange: (body: string) => void;
  onJump: (label: string) => void;
}) {
  const view = useMemo(() => footnoteOverview(body), [body]);
  if (view.notes.length === 0 && view.missing.length === 0 && view.unused.length === 0) return null;

  const done = (message: string) => toast(`${message} Simpan teks & maklumat untuk menerapkannya.`, "success");

  return (
    <section className="a-note-list" aria-label="Senarai nota sisi">
      <h3>Senarai nota sisi ({view.notes.length})</h3>
      <p className="admin-form-hint">Nombor mengikut susunan dalam teks, seperti yang pembaca lihat. Padam membuang nombor dalam teks dan isi notanya sekali.</p>
      {view.notes.length > 0 ? (
        <ol>
          {view.notes.map((note) => (
            <NoteRow
              key={`${note.label}:${note.text}`}
              heading={`Nota ${note.number}`}
              context={note.context}
              initial={note.text}
              onSave={(text) => {
                const next = setFootnoteText(body, note.label, text);
                if (next === null) return;
                onChange(next);
                done(`Nota ${note.number} diubah.`);
              }}
              onJump={() => onJump(note.label)}
              onRemove={async () => {
                if (!(await confirmAction(`Padam nota ${note.number}? Nombornya dalam teks dan isinya akan dibuang.`, { danger: true, confirmLabel: "Padam nota" }))) return;
                onChange(removeFootnote(body, note.label));
                done(`Nota ${note.number} dipadam.`);
              }}
            />
          ))}
        </ol>
      ) : null}

      {view.missing.length > 0 ? (
        <div className="a-note-problem" role="group" aria-label="Nombor tanpa nota">
          <h4>Nombor tanpa nota</h4>
          <p className="admin-form-hint">Nombor ini ada dalam teks tetapi tiada nota yang menyertainya, jadi pembaca hanya nampak kod mentah seperti [^2]. Tulis notanya, atau buang nombornya.</p>
          <ol>
            {view.missing.map((item) => (
              <NoteRow
                key={`missing:${item.label}`}
                heading={`[^${item.label}]`}
                context={item.context}
                initial=""
                saveLabel="Tulis nota"
                onSave={(text) => {
                  const next = setFootnoteText(body, item.label, text);
                  if (next === null) return;
                  onChange(next);
                  done("Nota ditulis.");
                }}
                onJump={() => onJump(item.label)}
                removeLabel="Buang nombor"
                onRemove={async () => {
                  if (!(await confirmAction(`Buang nombor [^${item.label}] daripada teks?`, { danger: true, confirmLabel: "Buang nombor" }))) return;
                  onChange(removeFootnote(body, item.label));
                  done("Nombor dibuang.");
                }}
              />
            ))}
          </ol>
        </div>
      ) : null}

      {view.unused.length > 0 ? (
        <div className="a-note-problem" role="group" aria-label="Nota tanpa nombor">
          <h4>Nota tanpa nombor</h4>
          <p className="admin-form-hint">Isi nota ini tiada nombor dalam teks, jadi pembaca tidak melihatnya. Padamkannya, atau letakkan nombor dengan Nota sisi di bar alat.</p>
          <ol>
            {view.unused.map((item) => (
              <li className="a-note-item" key={`unused:${item.label}`}>
                <div className="a-note-head">
                  <span className="a-note-number">[^{item.label}]</span>
                </div>
                <p className="a-note-text">{item.text}</p>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger admin-btn-sm"
                    onClick={async () => {
                      if (!(await confirmAction(`Padam nota tanpa nombor [^${item.label}]?`, { danger: true, confirmLabel: "Padam nota" }))) return;
                      onChange(removeFootnote(body, item.label));
                      done("Nota dipadam.");
                    }}
                  >
                    Padam
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function NoteRow({
  heading,
  context,
  initial,
  saveLabel = "Simpan nota",
  removeLabel = "Padam",
  onSave,
  onJump,
  onRemove
}: {
  heading: string;
  context: string;
  initial: string;
  saveLabel?: string;
  removeLabel?: string;
  onSave: (text: string) => void;
  onJump: () => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const id = useId();
  const changed = draft.trim().replace(/\s+/g, " ") !== initial;
  const empty = !draft.trim();
  return (
    <li className="a-note-item">
      <div className="a-note-head">
        <label className="a-note-number" htmlFor={id}>{heading}</label>
        {context ? <span className="a-note-context">selepas “{context}”</span> : null}
      </div>
      <textarea
        id={id}
        className="admin-textarea"
        rows={2}
        maxLength={600}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && changed && !empty) {
            e.preventDefault();
            onSave(draft);
          }
        }}
      />
      <div className="admin-form-actions">
        <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={!changed || empty} onClick={() => onSave(draft)}>{saveLabel}</button>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={onJump}>Pergi ke ayat</button>
        <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={onRemove}>{removeLabel}</button>
      </div>
    </li>
  );
}
