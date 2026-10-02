/**
 * Typing two hyphens ("--") gives an em dash, as in "Dia diam — lama." A line made only of hyphens
 * ("---", the scene break in Markdown) is left alone, and so are three or more hyphens in a row.
 */
const EM_DASH = "\u2014";

export function autoDash(text: string): string {
  return text
    .split("\n")
    .map((line) => (/^\s*-+\s*$/.test(line) ? line : line.replace(/(?<!-)--(?!-)/g, EM_DASH)))
    .join("\n");
}

/**
 * onChange helper for a controlled textarea: converts "--" and keeps the caret where the editor was typing,
 * because setting a shorter value would otherwise throw it to the end.
 */
export function dashChange(
  event: { target: HTMLTextAreaElement | HTMLInputElement },
  apply: (value: string) => void
): void {
  const el = event.target;
  const before = el.value;
  const after = autoDash(before);
  if (after === before) {
    apply(before);
    return;
  }
  const caret = autoDash(before.slice(0, el.selectionStart ?? before.length)).length;
  apply(after);
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      /* the field may have been removed */
    }
  });
}

/** For a contenteditable surface: converts "--" in the text node being typed in, keeping the caret. */
export function dashInSelection(): void {
  const selection = window.getSelection();
  const node = selection?.anchorNode;
  if (!selection || !node || node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent ?? "";
  if (/^\s*-+\s*$/.test(text)) return;
  const next = autoDash(text);
  if (next === text) return;
  const caret = autoDash(text.slice(0, selection.anchorOffset)).length;
  node.textContent = next;
  selection.collapse(node, Math.min(caret, next.length));
}
