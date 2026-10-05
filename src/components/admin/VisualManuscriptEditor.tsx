"use client";

import { dashInSelection, quotesInAllBlocks } from "../../lib/admin/auto-dash";
import { pastedHtmlToMarkdown } from "../../lib/admin/paste-format";
import { useEffect, useRef } from "react";
import { nextImageMarker } from "../../lib/reader/image-markers";
import { splitCommunicationBlocks } from "../../lib/reader/communication-blocks";

const MARKER = /^\[\[gambar:[1-9]\d*\]\]$/;

type ToolbarIconName = "bold" | "italic" | "paragraph" | "heading" | "scene" | "image" | "message" | "email";

function ToolbarIcon({ name }: { name: ToolbarIconName }) {
  if (name === "bold") return <span className="visual-manuscript-glyph visual-manuscript-glyph-bold" aria-hidden="true">B</span>;
  if (name === "italic") return <span className="visual-manuscript-glyph visual-manuscript-glyph-italic" aria-hidden="true">I</span>;
  if (name === "heading") return <span className="visual-manuscript-glyph visual-manuscript-glyph-heading" aria-hidden="true">H₂</span>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {name === "paragraph" && <><path d="M8 6h12M8 12h12M8 18h8"/><path d="M3 6h1m-1 6h1m-1 6h1"/></>}
    {name === "scene" && <><path d="M3 12h7m4 0h7"/><path d="M12 10v4"/></>}
    {name === "image" && <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.4"/><path d="m4 17 5-5 3 3 3-3 5 5"/></>}
    {name === "message" && <path d="M4 5h16v11H9l-5 4V5Z"/>}
    {name === "email" && <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>}
  </svg>;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The editor writes a literal "*" as "\*" and a literal "\" as "\\"; reading it back undoes that, so a round trip is stable. */
function unescapeLiteral(value: string): string {
  return value.replace(/\\([\\*])/g, "$1");
}

function inlineHtml(value: string): string {
  return value.split(/((?<!\\)\*\*[^*\n]+?(?<!\\)\*\*|(?<!\\)\*[^*\n]+?(?<!\\)\*)/g).map((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return `<strong>${escapeHtml(unescapeLiteral(part.slice(2, -2)))}</strong>`;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return `<em>${escapeHtml(unescapeLiteral(part.slice(1, -1)))}</em>`;
    return escapeHtml(unescapeLiteral(part)).replace(/\n/g, "<br>");
  }).join("");
}

/** Keep unsupported Markdown in the source editor; never silently flatten it. */
export function canEditVisually(markdown: string): boolean {
  const segments = splitCommunicationBlocks(markdown);
  if (segments.some((segment) => segment.content.includes(":::"))) return false;
  const blocks = segments.flatMap((segment) => segment.kind === "prose" ? segment.content.split(/\n{2,}/) : [segment.content]);
  if (blocks.some((block) => block.split("\n").length > 1 && block.split("\n").some((line) => MARKER.test(line.trim()) || /^(---|\*\*\*)$/.test(line.trim()) || /^## /.test(line)))) return false;
  const lines = blocks.flatMap((block) => block.split("\n"));
  return lines.every((line) => {
    if (!line.trim() || MARKER.test(line.trim()) || /^(---|\*\*\*)$/.test(line.trim())) return true;
    // "\*" and "\\" are what this editor itself writes for a literal * or \, so they are not unsupported syntax.
    const text = line.replace(/\\[\\*]/g, "");
    // Ordinary characters such as [10:32], <a@b.com>, _ and | are plain text in the visual editor and survive the round
    // trip; what stays in the source editor is syntax that would be flattened: code, links, images, other escapes.
    const unsupportedInline = /[`\\]|\]\(|!\[/;
    if (/^## (?!#)/.test(line)) return !unsupportedInline.test(text);
    if (/^#{1,6}\s|^>\s|^[-+*]\s|^\d+\.\s|^\s{4}|^\||^:::/.test(line)) return false;
    if (unsupportedInline.test(text)) return false;
    return !text.replace(/\*\*[^*\n]+\*\*|\*[^*\n]+\*/g, "").includes("*");
  });
}

function toHtml(markdown: string): string {
  if (!markdown.trim()) return "<p><br></p>";
  return splitCommunicationBlocks(markdown).map((segment) => segment.kind === "prose" ? segment.content.split(/\n{2,}/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (MARKER.test(trimmed)) return `<div class="visual-manuscript-marker" contenteditable="false" data-marker="${trimmed}">Gambar ${trimmed.match(/\d+/)?.[0]}</div>`;
    if (/^(---|\*\*\*)$/.test(trimmed)) return '<hr class="visual-manuscript-break">';
    if (trimmed.startsWith("## ")) return `<h2>${inlineHtml(trimmed.slice(3))}</h2>`;
    return `<p>${inlineHtml(block)}</p>`;
  }).join("") : `<div class="visual-manuscript-communication visual-manuscript-communication-${segment.kind}" data-communication="${segment.kind}">${inlineHtml(segment.content)}</div>`).join("");
}

function inlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\\/g, "\\\\").replace(/\*/g, "\\*");
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  const body = [...node.childNodes].map(inlineMarkdown).join("");
  if (node.tagName === "STRONG" || node.tagName === "B") return `**${body}**`;
  if (node.tagName === "EM" || node.tagName === "I") return `*${body}*`;
  if (node.tagName === "DIV" || node.tagName === "P") return `${body}\n`;
  return body;
}

function fromHtml(root: HTMLElement): string {
  return [...root.childNodes].map((node) => {
    if (node.nodeType === Node.TEXT_NODE) return inlineMarkdown(node);
    const element = node as HTMLElement;
    if (element.dataset.marker) return element.dataset.marker;
    if (element.dataset.communication) return `:::${element.dataset.communication}\n${[...element.childNodes].map(inlineMarkdown).join("").trimEnd()}\n:::`;
    if (element.tagName === "HR") return "---";
    const body = [...element.childNodes].map(inlineMarkdown).join("").trimEnd();
    if (element.tagName === "H2") return `## ${body}`;
    return body;
  }).join("\n\n");
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  existingAnchors: (string | null)[];
  onMarkerInserted: (marker: string) => void;
}

export default function VisualManuscriptEditor({ value, onChange, existingAnchors, onMarkerInserted }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const emittedRef = useRef<string | null>(null);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== emittedRef.current) editor.innerHTML = toHtml(value);
  }, [value]);

  function sync() {
    const editor = editorRef.current;
    if (!editor) return;
    dashInSelection();
    const next = fromHtml(editor);
    emittedRef.current = next;
    onChange(next);
  }

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) selectionRef.current = selection.getRangeAt(0).cloneRange();
  }

  function format(command: "bold" | "italic") {
    editorRef.current?.focus();
    if (selectionRef.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(selectionRef.current);
    }
    document.execCommand(command);
    sync();
    rememberSelection();
  }

  function insertBlock(kind: "paragraph" | "heading" | "scene" | "image" | "mesej" | "emel") {
    const editor = editorRef.current;
    if (!editor) return;
    const saved = selectionRef.current;
    // Text is selected: turn the paragraphs it touches into one message or e-mail box (their wording and emphasis kept),
    // instead of adding an empty box beside it.
    if ((kind === "mesej" || kind === "emel") && saved && !saved.collapsed && editor.contains(saved.commonAncestorContainer)) {
      // The part of a block that is inside the selection (a selection that merely begins at the end of a paragraph has none).
      const partOf = (block: Element) => {
        const part = document.createRange();
        part.selectNodeContents(block);
        if (part.compareBoundaryPoints(Range.START_TO_START, saved) < 0) part.setStart(saved.startContainer, saved.startOffset);
        if (part.compareBoundaryPoints(Range.END_TO_END, saved) > 0) part.setEnd(saved.endContainer, saved.endOffset);
        return part;
      };
      const htmlOf = (range: Range) => {
        const holder = document.createElement("div");
        holder.appendChild(range.cloneContents());
        return holder.innerHTML.replace(/<br\s*\/?>$/i, "").trim();
      };
      const touched = [...editor.children].filter((child) => /^(P|H2)$/.test(child.tagName) && saved.intersectsNode(child) && partOf(child).toString().trim().length > 0);
      if (touched.length > 0) {
        const first = touched[0]!;
        const last = touched[touched.length - 1]!;
        // Only the selected words go into the box; what is left of the first paragraph before it, and of the last after it, stays outside.
        const selectedHtml = touched.map((block) => htmlOf(partOf(block))).join("<br>");
        const beforeRange = document.createRange();
        beforeRange.selectNodeContents(first);
        const firstPart = partOf(first);
        beforeRange.setEnd(firstPart.startContainer, firstPart.startOffset);
        const afterRange = document.createRange();
        afterRange.selectNodeContents(last);
        const lastPart = partOf(last);
        afterRange.setStart(lastPart.endContainer, lastPart.endOffset);
        const before = beforeRange.toString().trim() ? htmlOf(beforeRange) : "";
        const after = afterRange.toString().trim() ? htmlOf(afterRange) : "";
        const tag = (block: Element) => block.tagName.toLowerCase();
        editor.focus();
        const selection = window.getSelection();
        const whole = document.createRange();
        whole.setStartBefore(first);
        whole.setEndAfter(last);
        selection?.removeAllRanges();
        selection?.addRange(whole);
        document.execCommand(
          "insertHTML",
          false,
          `${before ? `<${tag(first)}>${before}</${tag(first)}>` : ""}<div class="visual-manuscript-communication visual-manuscript-communication-${kind}" data-communication="${kind}">${selectedHtml}</div>${after ? `<${tag(last)}>${after}</${tag(last)}>` : ""}`
        );
        sync();
        rememberSelection();
        return;
      }
    }
    const anchor = saved && editor.contains(saved.startContainer)
      ? (saved.startContainer.nodeType === Node.ELEMENT_NODE ? saved.startContainer as Element : saved.startContainer.parentElement)?.closest("p,h2,div,hr")
      : null;
    let html: string;
    if (kind === "heading") html = "<h2>Tajuk bahagian</h2>";
    else if (kind === "scene") html = '<hr class="visual-manuscript-break">';
    else if (kind === "paragraph") html = "<p><br></p>";
    else if (kind === "image") {
      const marker = nextImageMarker(value, existingAnchors);
      html = `<div class="visual-manuscript-marker" contenteditable="false" data-marker="${marker}">Gambar ${marker.match(/\d+/)?.[0]}</div>`;
      onMarkerInserted(marker);
    } else html = `<div class="visual-manuscript-communication visual-manuscript-communication-${kind}" data-communication="${kind}">Tulis kandungan di sini.</div>`;
    // Inserted through the browser's own editing command, so Ctrl+Z (and Edit > Undo) takes the block away again.
    editor.focus();
    const selection = window.getSelection();
    // The block goes after the paragraph or heading the caret was in. Next to a break, a picture marker or another box
    // (where a new paragraph cannot be started), it goes at the end of the manuscript instead.
    const textBlock = anchor && anchor.parentElement === editor && /^(P|H2)$/.test(anchor.tagName) ? anchor : null;
    let target: Element | null = textBlock;
    if (!target) {
      const last = editor.lastElementChild;
      if (!(last && last.tagName === "P" && !last.textContent?.trim())) editor.insertAdjacentHTML("beforeend", "<p><br></p>");
      target = editor.lastElementChild;
    }
    const range = document.createRange();
    range.selectNodeContents(target!);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
    // A browser puts a block inserted at the end of a paragraph inside that paragraph, so start a new, empty one first
    // (unless the caret is already in an empty one); the block then replaces it.
    if (!(target!.tagName === "P" && !target!.textContent?.trim())) document.execCommand("insertParagraph");
    if (kind !== "paragraph") document.execCommand("insertHTML", false, html);
    sync();
    if (kind === "mesej" || kind === "emel") {
      // Select the placeholder text so the editor can type over it.
      const box = (window.getSelection()?.anchorNode?.parentElement ?? null)?.closest("[data-communication]");
      if (box) {
        const inner = document.createRange();
        inner.selectNodeContents(box);
        selection?.removeAllRanges();
        selection?.addRange(inner);
      }
    }
    rememberSelection();
  }

  return <div className="visual-manuscript">
    <div className="visual-manuscript-toolbar" role="toolbar" aria-label="Pemformatan manuskrip">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")} aria-label="Tebalkan teks terpilih" data-label="Tebal"><ToolbarIcon name="bold" /></button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")} aria-label="Condongkan teks terpilih" data-label="Condong"><ToolbarIcon name="italic" /></button>
      <span className="visual-manuscript-toolbar-divider" aria-hidden="true" />
      <button type="button" onClick={() => insertBlock("paragraph")} aria-label="Sisip perenggan" data-label="Perenggan"><ToolbarIcon name="paragraph" /></button>
      <button type="button" onClick={() => insertBlock("heading")} aria-label="Sisip tajuk bahagian" data-label="Tajuk bahagian"><ToolbarIcon name="heading" /></button>
      <button type="button" onClick={() => insertBlock("scene")} aria-label="Sisip pemisah adegan" data-label="Pemisah adegan"><ToolbarIcon name="scene" /></button>
      <span className="visual-manuscript-toolbar-divider" aria-hidden="true" />
      <button type="button" onClick={() => insertBlock("image")} aria-label="Sisip penanda gambar" data-label="Penanda gambar"><ToolbarIcon name="image" /></button>
      <button type="button" onClick={() => insertBlock("mesej")} aria-label="Sisip kotak mesej" data-label="Kotak mesej"><ToolbarIcon name="message" /></button>
      <button type="button" onClick={() => insertBlock("emel")} aria-label="Sisip kotak e-mel" data-label="Kotak e-mel"><ToolbarIcon name="email" /></button>
    </div>
    <div ref={editorRef} className="visual-manuscript-surface" contentEditable role="textbox" aria-label="Manuskrip visual" aria-multiline="true" suppressContentEditableWarning onInput={sync} onKeyDown={(event) => {
      // Enter inside a message or e-mail box starts a new line in that box (the browser would split it into a second box).
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
      const anchor = window.getSelection()?.anchorNode;
      const element = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (!element?.closest("[data-communication]")) return;
      event.preventDefault();
      document.execCommand("insertLineBreak");
      sync();
    }} onKeyUp={rememberSelection} onMouseUp={rememberSelection} onBlur={rememberSelection} onPaste={(event) => {
      event.preventDefault();
      // Text from Word or Google Docs keeps its italics and bold; anything else goes in as plain text, as before.
      const html = event.clipboardData.getData("text/html");
      const pasted = html ? pastedHtmlToMarkdown(html) : null;
      if (pasted?.formatted) {
        const paragraphs = pasted.markdown.split(/\n{2,}/);
        document.execCommand("insertHTML", false, paragraphs.length === 1 ? inlineHtml(paragraphs[0]!) : paragraphs.map((p) => `<p>${inlineHtml(p)}</p>`).join(""));
      } else {
        document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      }
      if (editorRef.current) quotesInAllBlocks(editorRef.current);
      sync();
    }} />
    <p className="admin-form-hint">Sunting terus pada halaman. Pilih teks untuk Tebal atau Condong; gunakan butang untuk menambah blok. Tukar ke Markdown untuk kawalan penuh.</p>
  </div>;
}
