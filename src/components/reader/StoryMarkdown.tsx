import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { GlossaryMap } from "./types";
import { headingId } from "../../lib/reader/inline-chapters";
import GlossaryTerm from "./GlossaryTerm";
import { glossaryPattern } from "../../lib/reader/glossary-first";
import { splitCommunicationBlocks } from "../../lib/reader/communication-blocks";
import { normalizeSceneBreaks } from "../../lib/reader/scene-breaks";
import { splitFootnoteTokens } from "../../lib/reader/footnotes";

function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (React.isValidElement(node)) return plainText((node.props as { children?: ReactNode }).children);
  return "";
}

function normalizeMarkdown(markdown: string): string {
  // Preserve editorial paragraph boundaries exactly as authored.
  // Markdown uses blank lines (\n\n) to delimit paragraphs; collapsing them
  // here would turn an entire scene into a single paragraph.
  return normalizeSceneBreaks(markdown.replace(/\r\n/g, "\n"));
}

function decorateGlossary(text: string, glossary: GlossaryMap, used: Set<string>): ReactNode[] {
  const terms = Object.keys(glossary);
  const pattern = glossaryPattern(terms);
  if (!pattern) return [text];

  const result: ReactNode[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    result.push(text.slice(cursor, start));
    const key = terms.find((term) => term.toLocaleLowerCase("ms") === match[1]!.toLocaleLowerCase("ms"));
    if (key && !used.has(key)) {
      used.add(key);
      result.push(<GlossaryTerm key={`${key}-${start}`} term={key} termDisplay={glossary[key].termDisplay} meaning={glossary[key].meaning}>{match[0]}</GlossaryTerm>);
    } else {
      result.push(match[0]);
    }
    cursor = start + match[0].length;
  }
  result.push(text.slice(cursor));
  return result;
}

/** A reference in the text: a small number that links to its note. The first reference to a note is where "back" returns to. */
function FootnoteRef({ number, first }: { number: number; first: boolean }) {
  return (
    <sup className="footnote-ref">
      <a href={`#nota-${number}`} id={first ? `rujuk-${number}` : undefined} role="doc-noteref" aria-label={`Nota kaki ${number}`}>{number}</a>
    </sup>
  );
}

/** Turns the footnote marks left in the text by markFootnoteReferences into numbers. */
function withFootnotes(children: ReactNode, numbers: Record<string, number>): ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const parts = splitFootnoteTokens(child);
    if (parts.every((part) => "text" in part)) return child;
    return parts.map((part, index) => "text" in part
      ? part.text
      : numbers[part.footnote] !== undefined
        ? <FootnoteRef key={`fn-${index}`} number={numbers[part.footnote]!} first={part.first} />
        : null);
  });
}

function decorateChildren(children: ReactNode, glossary: GlossaryMap, used: Set<string>): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? decorateGlossary(child, glossary, used)
      : React.isValidElement<{ children?: ReactNode }>(child) && child.type !== FootnoteRef && child.type !== "a" && child.type !== "code" && child.type !== "button"
        ? React.cloneElement(child, { children: decorateChildren(child.props.children, glossary, used) })
        : child
  );
}

export default function StoryMarkdown({
  children,
  glossary,
  footnoteNumbers = {}
}: {
  children: string;
  glossary: GlossaryMap;
  /** label -> number of the notes of this story (see lib/reader/footnotes); references are marked in the text. */
  footnoteNumbers?: Record<string, number>;
}) {
  const used = new Set<string>();
  const components = {
    h1: () => null,
    h2: ({ children }: { children?: ReactNode }) => <h2 id={headingId(plainText(children))}>{children}</h2>,
    p: ({ children }: { children?: ReactNode }) => <p>{decorateChildren(withFootnotes(children, footnoteNumbers), glossary, used)}</p>,
    em: ({ children }: { children?: ReactNode }) => <em>{children}</em>,
    hr: () => <div className="scene-break" aria-hidden="true"><span>•</span></div>,
  };
  return (
    <>
      {splitCommunicationBlocks(normalizeMarkdown(children)).map((segment, index) => segment.kind === "prose"
        ? <ReactMarkdown key={index} components={components}>{segment.content}</ReactMarkdown>
        : <div key={index} className={`story-communication story-communication-${segment.kind}`} role="group" aria-label={segment.kind === "mesej" ? "Mesej dalam cerita" : "E-mel dalam cerita"}>
            <ReactMarkdown components={components}>{segment.content}</ReactMarkdown>
          </div>)}
    </>
  );
}
