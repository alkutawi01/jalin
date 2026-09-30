/** Return the Markdown paragraph under the editor caret for inline image placement. */
export function paragraphAtCaret(body: string, caret: number): string {
  const position = Math.max(0, Math.min(caret, body.length));
  const before = body.slice(0, position);
  const after = body.slice(position);
  const previousBreak = before.lastIndexOf("\n\n");
  const start = previousBreak < 0 ? 0 : previousBreak + 2;
  const nextBreak = after.indexOf("\n\n");
  const end = nextBreak < 0 ? body.length : position + nextBreak;
  return body.slice(start, end).trim();
}
