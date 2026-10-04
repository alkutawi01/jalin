/**
 * Turns what the clipboard holds when text is copied from Word, Google Docs or a web page (HTML) into the Markdown the
 * manuscript uses, so italics and bold are kept instead of being flattened to plain text. Pure string work (no DOM),
 * so it can be tested. Only emphasis and paragraph structure are kept: no tables, links, fonts, colours or sizes.
 */

export interface PasteResult {
  /** The text as Markdown: *italic*, **bold**, paragraphs separated by a blank line. */
  markdown: string;
  /** True when at least one run was italic or bold: the only case in which the plain-text paste would lose something. */
  formatted: boolean;
}

const BLOCK_TAGS = new Set(["p", "div", "li", "tr", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "section", "article", "ul", "ol", "table"]);
const SKIP_TAGS = new Set(["head", "style", "script", "title", "xml"]);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1]!.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Italic/bold from an inline style attribute. "mso-bidi-font-style" and the like are not the real property. */
function styleFlags(style: string): { italic?: boolean; bold?: boolean } {
  const out: { italic?: boolean; bold?: boolean } = {};
  for (const part of style.split(";")) {
    const [rawName, ...rest] = part.split(":");
    const name = (rawName ?? "").trim().toLowerCase();
    const value = rest.join(":").trim().toLowerCase();
    if (name === "font-style") out.italic = value === "italic" || value === "oblique";
    if (name === "font-weight") out.bold = value === "bold" || value === "bolder" || (/^\d+$/.test(value) && Number(value) >= 600);
  }
  return out;
}

interface Run { text: string; italic: boolean; bold: boolean }

export function pastedHtmlToMarkdown(html: string): PasteResult {
  let source = html;
  const start = source.indexOf("<!--StartFragment-->");
  const end = source.indexOf("<!--EndFragment-->");
  if (start >= 0 && end > start) source = source.slice(start + "<!--StartFragment-->".length, end);
  source = source.replace(/<!--[\s\S]*?-->/g, "");

  const paragraphs: Run[][] = [[]];
  const stack: Array<{ tag: string; italic: boolean; bold: boolean; skip: boolean }> = [{ tag: "", italic: false, bold: false, skip: false }];
  const top = () => stack[stack.length - 1]!;
  const newParagraph = () => { if (paragraphs[paragraphs.length - 1]!.length > 0) paragraphs.push([]); };

  for (const token of source.match(/<\/?[a-zA-Z][^>]*>|[^<]+/g) ?? []) {
    if (token[0] === "<") {
      const closing = token[1] === "/";
      const tag = (token.match(/^<\/?([a-zA-Z][\w:-]*)/)?.[1] ?? "").toLowerCase();
      if (closing) {
        // Close back to the matching open tag (browsers' HTML is sloppy about unclosed tags).
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i]!.tag === tag) { stack.length = i; break; }
        }
        if (BLOCK_TAGS.has(tag)) newParagraph();
        continue;
      }
      if (tag === "br") { paragraphs[paragraphs.length - 1]!.push({ text: "\n", italic: false, bold: false }); continue; }
      if (BLOCK_TAGS.has(tag)) newParagraph();
      if (/\/>$/.test(token) || ["img", "hr", "meta", "link", "input"].includes(tag)) continue;
      const parent = top();
      const style = styleFlags(token.match(/\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i)?.slice(1).find((v) => v !== undefined) ?? "");
      let italic = parent.italic;
      let bold = parent.bold;
      if (tag === "i" || tag === "em") italic = true;
      if (tag === "b" || tag === "strong") bold = true;
      if (style.italic !== undefined) italic = style.italic;
      if (style.bold !== undefined) bold = style.bold;
      stack.push({ tag, italic, bold, skip: parent.skip || SKIP_TAGS.has(tag) });
      continue;
    }
    if (top().skip) continue;
    const text = decode(token).replace(/[\r\n\t ]+/g, " ");
    if (text === "") continue;
    const state = top();
    paragraphs[paragraphs.length - 1]!.push({ text, italic: state.italic, bold: state.bold });
  }

  let formatted = false;
  const lines: string[] = [];
  for (const runs of paragraphs) {
    // Merge neighbouring runs that look the same, so markers wrap a whole phrase and not each piece of it.
    const merged: Run[] = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last && last.italic === run.italic && last.bold === run.bold) last.text += run.text;
      else merged.push({ ...run });
    }
    let line = "";
    for (const run of merged) {
      const lead = run.text.match(/^\s*/)![0];
      const trail = run.text.match(/\s*$/)![0];
      const core = run.text.trim();
      if (core === "") { line += run.text; continue; }
      // Emphasis marks must hug the words: "*word *" would not be read as italic. Italic wins when a run is both.
      const marked = run.italic ? `*${core}*` : run.bold ? `**${core}**` : core;
      if (run.italic || run.bold) formatted = true;
      line += `${lead}${marked}${trail}`;
    }
    line = line.replace(/ *\n */g, "\n").replace(/ {2,}/g, " ").trim();
    if (line) lines.push(line);
  }
  return { markdown: lines.join("\n\n"), formatted };
}
