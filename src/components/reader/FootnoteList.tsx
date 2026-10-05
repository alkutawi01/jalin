import ReactMarkdown from "react-markdown";
import type { Footnote } from "../../lib/reader/footnotes";

/**
 * The notes of a story, numbered, with a way back to the place in the text. On a wide screen the same notes are also set in
 * the right margin (see FootnoteMargin); this list stays in the page for narrow screens, printing and screen readers.
 */
export default function FootnoteList({ notes }: { notes: Footnote[] }) {
  if (notes.length === 0) return null;
  return (
    <section className="footnotes" role="doc-endnotes" aria-labelledby="footnotes-title" data-footnotes>
      <h2 id="footnotes-title" className="footnotes-title">Nota kaki</h2>
      <ol>
        {notes.map((note) => (
          <li key={note.label} id={`nota-${note.number}`} role="doc-endnote" value={note.number}>
            <div className="footnote-text">
              <ReactMarkdown>{note.text}</ReactMarkdown>
            </div>
            <a className="footnote-back" href={`#rujuk-${note.number}`} role="doc-backlink" aria-label={`Kembali ke nota ${note.number} dalam teks`}>↩</a>
          </li>
        ))}
      </ol>
    </section>
  );
}
