"use client";

import { dashInSelection, quotesInAllBlocks } from "../../lib/admin/auto-dash";
import { pastedHtmlToMarkdown } from "../../lib/admin/paste-format";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { nextImageMarker } from "../../lib/reader/image-markers";
import { splitCommunicationBlocks } from "../../lib/reader/communication-blocks";
import { confirmAction, toast } from "../../lib/admin/dialogs";
import { cleanFootnoteText, nextFootnoteLabel } from "../../lib/admin/footnote-insert";
import { splitFootnotes } from "../../lib/admin/footnote-edit";
import { buildNoteContext, joinProseAndNotes, noteChipHtml, noteWithText, notesToWrite, withNoteChips, type NoteContext } from "../../lib/admin/visual-notes";
import FootnoteInserter from "./FootnoteInserter";

const MARKER = /^\[\[gambar:[1-9]\d*\]\]$/;

type ToolbarIconName = "bold" | "italic" | "paragraph" | "heading" | "scene" | "image" | "message" | "email" | "note";

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
    {name === "note" && <><path d="M5 4h14v10l-6 6H5Z"/><path d="M13 20v-6h6"/><path d="M8.5 9h7"/></>}
  </svg>;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** The editor writes a literal "*" as "\*" and a literal "\" as "\\"; reading it back undoes that, so a round trip is stable. */
function unescapeLiteral(value: string): string {
  return value.replace(/\\([\\*])/g, "$1");
}

/** The numbers of side notes in the text become chips when `notes` is given (see lib/admin/visual-notes.ts). */
function inlineHtml(value: string, notes?: NoteContext): string {
  const text = (part: string) => (notes ? withNoteChips(escapeHtml(unescapeLiteral(part)), notes) : escapeHtml(unescapeLiteral(part)));
  return value.split(/((?<!\\)\*\*[^*\n]+?(?<!\\)\*\*|(?<!\\)\*[^*\n]+?(?<!\\)\*)/g).map((part) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return `<strong>${text(part.slice(2, -2))}</strong>`;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return `<em>${text(part.slice(1, -1))}</em>`;
    return text(part).replace(/\n/g, "<br>");
  }).join("");
}

/** Keep unsupported Markdown in the source editor; never silently flatten it. The side notes are kept apart by the editor, so only the text counts. */
export function canEditVisually(markdown: string): boolean {
  const segments = splitCommunicationBlocks(splitFootnotes(markdown).prose);
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

function toHtml(markdown: string, notes?: NoteContext): string {
  if (!markdown.trim()) return "<p><br></p>";
  return splitCommunicationBlocks(markdown).map((segment) => segment.kind === "prose" ? segment.content.split(/\n{2,}/).map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return "";
    if (MARKER.test(trimmed)) {
      const number = trimmed.match(/\d+/)?.[0];
      return `<div class="visual-manuscript-marker" contenteditable="false" data-marker="${trimmed}"><span data-marker-label>Gambar ${number}</span><button type="button" data-remove-marker aria-label="Buang penanda Gambar ${number}" title="Buang penanda Gambar ${number}">Buang</button></div>`;
    }
    if (/^(---|\*\*\*)$/.test(trimmed)) return '<hr class="visual-manuscript-break">';
    if (trimmed.startsWith("## ")) return `<h2>${inlineHtml(trimmed.slice(3), notes)}</h2>`;
    return `<p>${inlineHtml(block, notes)}</p>`;
  }).join("") : `<div class="visual-manuscript-communication visual-manuscript-communication-${segment.kind}" data-communication="${segment.kind}">${inlineHtml(segment.content, notes)}</div>`).join("");
}

function inlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\\/g, "\\\\").replace(/\*/g, "\\*");
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  // A side note's chip is written back as its number in the text; the note's words are written after the text (see sync).
  if (node.tagName === "SUP" && node.dataset.note) return `[^${node.dataset.note}]`;
  const body = [...node.childNodes].map(inlineMarkdown).join("");
  if (node.tagName === "STRONG" || node.tagName === "B") return `**${body}**`;
  if (node.tagName === "EM" || node.tagName === "I") return `*${body}*`;
  if (node.tagName === "DIV" || node.tagName === "P") return `${body}\n`;
  return body;
}

/**
 * The note chip right next to the cursor, on the side Backspace (before) or Delete (after) works on. A browser does not always delete a chip
 * at the end of a line in one key press, so the editor does it itself (through the browser's own editing command, which Undo can take back).
 */
function noteChipBeside(selection: Selection, direction: "before" | "after"): HTMLElement | null {
  const node = selection.anchorNode;
  if (!node || !selection.isCollapsed) return null;
  const offset = selection.anchorOffset;
  let neighbour: Node | null = null;
  if (node.nodeType === Node.TEXT_NODE) {
    const length = node.textContent?.length ?? 0;
    if (direction === "before" && offset === 0) neighbour = node.previousSibling;
    else if (direction === "after" && offset === length) neighbour = node.nextSibling;
  } else {
    neighbour = direction === "before" ? node.childNodes[offset - 1] ?? null : node.childNodes[offset] ?? null;
  }
  // An empty piece of text between the cursor and the chip does not count.
  while (neighbour && neighbour.nodeType === Node.TEXT_NODE && !neighbour.textContent) neighbour = direction === "before" ? neighbour.previousSibling : neighbour.nextSibling;
  return neighbour instanceof HTMLElement && neighbour.dataset.note ? neighbour : null;
}

/** The chips are numbered as a reader sees the notes: by the first of each in the text. Done on every change, so adding, moving and deleting keep the numbers right. */
function renumberNotes(root: HTMLElement) {
  const numbers = new Map<string, number>();
  root.querySelectorAll<HTMLElement>("[data-note]").forEach((chip) => {
    const label = chip.dataset.note!;
    if (!numbers.has(label)) numbers.set(label, numbers.size + 1);
    const number = numbers.get(label)!;
    if (chip.textContent !== String(number)) chip.textContent = String(number);
    chip.setAttribute("aria-label", `Nota ${number}: sunting`);
  });
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
  const caretRef = useRef<{ block: number; offset: number } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  /** The side notes of the manuscript: the words are kept here (not in the text of the editor) and written after the text on every change. */
  const notesRef = useRef<NoteContext>({ numbers: {}, definitions: new Map(), orphans: [] });
  /** What was last drawn into the editor from `value`; null once the editor has sent text of its own. */
  const drawnRef = useRef<string | null>(null);
  const [editing, setEditing] = useState<{ label: string; number: number; text: string; rect: { left: number; top: number; bottom: number } } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    // The text is drawn again only when it came from somewhere else (the Markdown box, the list of notes, a reset), never because the page redrew.
    if (editor && value !== emittedRef.current && value !== drawnRef.current) {
      const { prose, context } = buildNoteContext(value);
      notesRef.current = context;
      editor.innerHTML = toHtml(prose, context);
      drawnRef.current = value;
      setEditing(null);
    }
    editor?.querySelectorAll<HTMLElement>("[data-marker]").forEach((block) => {
      const marker = block.dataset.marker;
      const label = block.querySelector<HTMLElement>("[data-marker-label]");
      if (marker && label) label.textContent = `Gambar ${marker.match(/\d+/)?.[0]} · ${existingAnchors.includes(marker) ? "imej dipautkan" : "belum dipautkan"}`;
    });
  }, [value, existingAnchors]);

  function sync() {
    const editor = editorRef.current;
    if (!editor) return;
    dashInSelection();
    renumberNotes(editor);
    const labels = [...new Set([...editor.querySelectorAll<HTMLElement>("[data-note]")].map((chip) => chip.dataset.note!))];
    const next = joinProseAndNotes(fromHtml(editor), notesToWrite(labels, notesRef.current));
    emittedRef.current = next;
    drawnRef.current = null;
    onChange(next);
  }

  function chipOf(label: string): HTMLElement | null {
    return editorRef.current?.querySelector<HTMLElement>(`[data-note="${label}"]`) ?? null;
  }

  /** Opens the box for the note of a chip: its words, to read, change or remove. */
  function openNote(chip: HTMLElement) {
    const label = chip.dataset.note;
    const definition = label ? notesRef.current.definitions.get(label) : undefined;
    if (!label || !definition) return;
    const box = chip.getBoundingClientRect();
    setEditing({ label, number: Number(chip.textContent) || 0, text: definition.text, rect: { left: box.left, top: box.top, bottom: box.bottom } });
  }

  function closeNote(returnFocus = false) {
    const label = editing?.label;
    setEditing(null);
    if (returnFocus && label) window.requestAnimationFrame(() => chipOf(label)?.focus());
  }

  function saveNote() {
    if (!editing) return;
    const clean = cleanFootnoteText(editing.text);
    if (!clean) return;
    notesRef.current.definitions.set(editing.label, noteWithText(editing.label, clean));
    chipOf(editing.label)?.setAttribute("title", clean.length > 140 ? `${clean.slice(0, 140)}…` : clean);
    sync();
    toast(`Nota ${editing.number} diubah. Simpan teks & maklumat untuk menerapkannya.`, "success");
    closeNote(true);
  }

  async function removeNote() {
    if (!editing) return;
    const { label, number } = editing;
    if (!(await confirmAction(`Padam nota ${number}? Nombornya dalam teks dan isinya akan dibuang.`, { danger: true, confirmLabel: "Padam nota" }))) return;
    editorRef.current?.querySelectorAll(`[data-note="${label}"]`).forEach((chip) => chip.remove());
    sync();
    toast(`Nota ${number} dipadam. Simpan teks & maklumat untuk menerapkannya.`, "success");
    setEditing(null);
  }

  // The box sits beside its chip (below it, or above when there is no room) and goes when the page moves under it or a click lands elsewhere.
  useLayoutEffect(() => {
    const pop = popoverRef.current;
    if (!editing || !pop) return;
    const width = Math.min(340, window.innerWidth - 16);
    const left = Math.max(8, Math.min(editing.rect.left, window.innerWidth - width - 8));
    const below = editing.rect.bottom + 8;
    const top = below + pop.offsetHeight > window.innerHeight - 8 ? Math.max(8, editing.rect.top - pop.offsetHeight - 8) : below;
    pop.style.width = `${width}px`;
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }, [editing]);

  const isEditing = editing !== null;
  useEffect(() => {
    if (!isEditing) return;
    const close = (event: Event) => {
      if (event.target instanceof Node && popoverRef.current?.contains(event.target)) return;
      setEditing(null);
    };
    const away = (event: MouseEvent) => {
      if (event.target instanceof Node && !popoverRef.current?.contains(event.target) && !(event.target as HTMLElement).closest?.("[data-note]")) setEditing(null);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("mousedown", away);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("mousedown", away);
    };
  }, [isEditing]);

  function rememberSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (selection?.rangeCount && editor?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
      // Also as a place (which block, how many characters in): the saved range is lost when the editor redraws its text before the first edit.
      const range = selection.getRangeAt(0);
      const block = [...editor.children].findIndex((child) => child.contains(range.startContainer));
      if (block >= 0) {
        const before = document.createRange();
        before.selectNodeContents(editor.children[block]!);
        before.setEnd(range.startContainer, range.startOffset);
        caretRef.current = { block, offset: before.toString().length };
      }
    }
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
      const number = marker.match(/\d+/)?.[0];
      html = `<div class="visual-manuscript-marker" contenteditable="false" data-marker="${marker}"><span data-marker-label>Gambar ${number} · belum dipautkan</span><button type="button" data-remove-marker aria-label="Buang penanda Gambar ${number}" title="Buang penanda Gambar ${number}">Buang</button></div>`;
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

  /** A side note: its number goes where the cursor was, as a chip; its words are kept apart and written after the text (the reader sets them in the margin). */
  function insertFootnoteAtCursor(text: string): boolean {
    const editor = editorRef.current;
    const clean = cleanFootnoteText(text);
    if (!editor || !clean) return false;
    // A number not used by the text or by a note the editor still holds (one whose chip was deleted can come back with Undo).
    const label = nextFootnoteLabel(`${value} ${[...notesRef.current.definitions.keys()].map((key) => `[^${key}]`).join(" ")}`);
    // The cursor is a place (block and characters in), found again in whatever the editor now holds. A cursor in a heading or box, or none at
    // all, would put the number somewhere wrong: the end of the story's text is used instead.
    const caret = caretRef.current;
    const block = caret ? editor.children[caret.block] ?? null : null;
    const usable = !!block && block.tagName === "P";
    editor.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    if (usable && caret) {
      const walker = document.createTreeWalker(block!, NodeFilter.SHOW_TEXT);
      let remaining = caret.offset;
      let placed = false;
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const length = node.textContent?.length ?? 0;
        if (remaining <= length) {
          range.setStart(node, remaining);
          placed = true;
          break;
        }
        remaining -= length;
      }
      if (!placed) range.selectNodeContents(block!);
      range.collapse(placed);
    } else {
      const prose = [...editor.children].filter((child) => child.tagName === "P" && (child.textContent ?? "").trim());
      const last = prose[prose.length - 1] ?? null;
      if (!last) {
        editor.insertAdjacentHTML("afterbegin", "<p><br></p>");
        range.selectNodeContents(editor.firstElementChild!);
      } else range.selectNodeContents(last);
      range.collapse(false);
    }
    selection?.removeAllRanges();
    selection?.addRange(range);
    notesRef.current.definitions.set(label, noteWithText(label, clean));
    document.execCommand("insertHTML", false, noteChipHtml(label, 0, clean));
    // Making room for the chip, the browser turns the ordinary spaces beside it into non-breaking ones, which would be saved in the manuscript.
    const placed = chipOf(label);
    const before = placed?.previousSibling;
    const after = placed?.nextSibling;
    if (before?.nodeType === Node.TEXT_NODE && before.textContent?.endsWith("\u00a0")) before.textContent = before.textContent.replace(/\u00a0$/, " ");
    if (after?.nodeType === Node.TEXT_NODE && after.textContent?.startsWith("\u00a0")) after.textContent = after.textContent.replace(/^\u00a0/, " ");
    sync();
    rememberSelection();
    toast(`Nota ${label} disisipkan. Pembaca melihatnya di sisi teks.`, "success");
    return true;
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
      <span className="visual-manuscript-toolbar-divider" aria-hidden="true" />
      <button type="button" onClick={() => setNoteOpen((open) => !open)} aria-label="Sisip nota sisi" aria-expanded={noteOpen} data-label="Nota sisi"><ToolbarIcon name="note" /></button>
    </div>
    <FootnoteInserter open={noteOpen} onOpenChange={setNoteOpen} onInsert={insertFootnoteAtCursor} />
    <div ref={editorRef} className="visual-manuscript-surface" contentEditable role="textbox" aria-label="Manuskrip visual" aria-multiline="true" suppressContentEditableWarning onInput={sync} onKeyDown={(event) => {
      // Enter (or Space) on a note's number opens its note, as a click does.
      const chip = (event.target as HTMLElement).closest?.<HTMLElement>("[data-note]");
      if (chip && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        openNote(chip);
        return;
      }
      // Backspace or Delete next to a note's number removes the number (and so the note); Undo brings both back.
      if ((event.key === "Backspace" || event.key === "Delete") && !event.nativeEvent.isComposing) {
        const selection = window.getSelection();
        const beside = selection ? noteChipBeside(selection, event.key === "Backspace" ? "before" : "after") : null;
        if (selection && beside) {
          event.preventDefault();
          const range = document.createRange();
          range.selectNode(beside);
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand("delete");
          sync();
          return;
        }
      }
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
    }} onClick={(event) => {
      const chip = (event.target as HTMLElement).closest<HTMLElement>("[data-note]");
      if (chip && editorRef.current?.contains(chip)) {
        event.preventDefault();
        openNote(chip);
        return;
      }
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-remove-marker]");
      const markerElement = button?.closest<HTMLElement>("[data-marker]");
      const marker = markerElement?.dataset.marker;
      if (!marker || !markerElement || !editorRef.current?.contains(markerElement)) return;
      event.preventDefault();
      void (async () => {
        const linked = existingAnchors.includes(marker);
        const confirmed = await confirmAction(
          linked
            ? `Buang penanda ${marker} daripada manuskrip? Gambar yang dipautkan kekal dalam senarai tetapi tidak akan muncul dalam karya selepas teks disimpan. Padam gambar daripada kadnya jika mahu membuangnya sepenuhnya.`
            : `Buang penanda ${marker} daripada manuskrip?`,
          { danger: linked, confirmLabel: "Buang penanda" }
        );
        if (!confirmed || !editorRef.current?.contains(markerElement)) return;
        markerElement.remove();
        sync();
      })();
    }} />
    {editing ? (
      <div ref={popoverRef} className="visual-manuscript-popover" role="dialog" aria-label={`Sunting nota ${editing.number}`} onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          closeNote(true);
        }
      }}>
        <label htmlFor="vm-note-text">Nota {editing.number}</label>
        <textarea
          id="vm-note-text"
          className="admin-textarea"
          rows={4}
          maxLength={600}
          autoFocus
          value={editing.text}
          onChange={(event) => setEditing({ ...editing, text: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              saveNote();
            }
          }}
        />
        <div className="visual-manuscript-popover-actions">
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm"
            disabled={!cleanFootnoteText(editing.text) || cleanFootnoteText(editing.text) === notesRef.current.definitions.get(editing.label)?.text}
            onClick={saveNote}
          >
            Simpan nota
          </button>
          <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => void removeNote()}>Padam nota</button>
          <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => closeNote(true)}>Tutup</button>
        </div>
      </div>
    ) : null}
    <p className="admin-form-hint">Nota sisi ialah nombor kecil dalam teks: klik nombor itu untuk membaca, menukar atau memadam notanya. Untuk nota baharu, letakkan kursor di tempat nombor patut berada dan tekan ikon nota di bar alat. Pilih teks untuk Tebal atau Condong. Penanda gambar boleh dibuang di sini; simpan teks untuk menerapkan perubahan. Gambar yang sudah dimuat naik dipadam secara berasingan melalui kadnya.</p>
  </div>;
}
