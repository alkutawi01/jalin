import type { ClipboardEvent } from "react";
import { pastedHtmlToMarkdown } from "../../lib/admin/paste-format";

/**
 * Paste into a Markdown box. Text copied from Word or Google Docs carries its italics and bold as HTML; the default paste
 * keeps only the words. When there is emphasis to keep, it goes in as Markdown (*italic*, **bold**); otherwise the normal
 * paste runs unchanged.
 */
export function pasteAsMarkdown(event: ClipboardEvent<HTMLTextAreaElement>): void {
  const html = event.clipboardData.getData("text/html");
  if (!html) return;
  const result = pastedHtmlToMarkdown(html);
  if (!result.formatted) return;
  event.preventDefault();
  const box = event.currentTarget;
  box.setRangeText(result.markdown, box.selectionStart, box.selectionEnd, "end");
  // The box is controlled by React: an input event tells it the value changed.
  box.dispatchEvent(new Event("input", { bubbles: true }));
}
