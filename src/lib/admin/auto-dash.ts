/**
 * Typing two hyphens ("--") gives an em dash, as in "Dia diam — lama." A line made only of hyphens
 * ("---", the scene break in Markdown) is left alone, and so are three or more hyphens in a row.
 *
 * The same typing helpers also set straight quotation marks to the house style (see smart-quotes.ts).
 */
import { smartQuotes } from "./smart-quotes";

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
  const after = smartQuotes(autoDash(before));
  if (after === before) {
    apply(before);
    return;
  }
  const caret = smartQuotes(autoDash(before.slice(0, el.selectionStart ?? before.length))).length;
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
  if (!/^\s*-+\s*$/.test(text)) {
    const next = autoDash(text);
    if (next !== text) {
      const caret = autoDash(text.slice(0, selection.anchorOffset)).length;
      node.textContent = next;
      selection.collapse(node, Math.min(caret, next.length));
    }
  }
  const block = node.parentElement?.closest("p,li,blockquote,h1,h2,h3,h4");
  if (block) quotesInBlock(block);
}

/**
 * Sets the quotation marks of one block (a paragraph, say) to the house style. The block's text is read as a whole,
 * because a mark can sit at the edge of an italic run, and each text node is given back its own part. Replacements are
 * one character for one, so a caret inside the block stays where it is.
 */
export function quotesInBlock(block: Element): void {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  const whole = nodes.map((n) => n.data).join("");
  const converted = smartQuotes(whole);
  if (converted === whole) return;
  // Replacing text moves a caret that sits right after the changed character, so note it and put it back.
  const selection = window.getSelection();
  const caretNode = selection?.isCollapsed ? selection.anchorNode : null;
  const caretOffset = selection?.anchorOffset ?? 0;
  let at = 0;
  for (const n of nodes) {
    const part = converted.slice(at, at + n.data.length);
    at += n.data.length;
    if (part !== n.data) n.replaceData(0, n.data.length, part);
  }
  if (selection && caretNode && caretNode.isConnected) selection.collapse(caretNode, Math.min(caretOffset, caretNode.textContent?.length ?? caretOffset));
}

/** The same for every paragraph of the editor, for pasted text. */
export function quotesInAllBlocks(root: Element): void {
  root.querySelectorAll("p,li,blockquote,h1,h2,h3,h4").forEach((block) => quotesInBlock(block));
}
