import type { ReactNode } from "react";

/**
 * Card attribution with the title of the ORIGINAL work in italics ("Petikan daripada <i>Salina</i> · A. Samad Said").
 * Jalin's own titles are never italic; only titles of works taken from elsewhere are.
 */
export function renderAttribution(text: string): ReactNode {
  const fragment = text.match(/^Petikan daripada (.+?)(?: · (.+))?$/);
  if (fragment) {
    const [, title, author] = fragment;
    return (
      <>
        Petikan daripada <cite>{title}</cite>
        {author ? <> · {author}</> : null}
      </>
    );
  }
  const synopsis = text.match(/^Berdasarkan (.+?)(?: karya (.+))?$/);
  if (synopsis) {
    const [, title, author] = synopsis;
    return (
      <>
        Berdasarkan <cite>{title}</cite>
        {author ? <> karya {author}</> : null}
      </>
    );
  }
  return text;
}
