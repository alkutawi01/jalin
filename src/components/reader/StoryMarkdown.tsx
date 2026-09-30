import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { GlossaryMap } from "./types";
import { headingId } from "../../lib/reader/inline-chapters";
import GlossaryTerm from "./GlossaryTerm";
import { glossaryPattern } from "../../lib/reader/glossary-first";

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
  return markdown.replace(/\r\n/g, "\n");
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
      result.push(<GlossaryTerm key={`${key}-${start}`} term={key} meaning={glossary[key].meaning}>{match[0]}</GlossaryTerm>);
    } else {
      result.push(match[0]);
    }
    cursor = start + match[0].length;
  }
  result.push(text.slice(cursor));
  return result;
}

function decorateChildren(children: ReactNode, glossary: GlossaryMap, used: Set<string>): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? decorateGlossary(child, glossary, used)
      : React.isValidElement<{ children?: ReactNode }>(child) && child.type !== "a" && child.type !== "code" && child.type !== "button"
        ? React.cloneElement(child, { children: decorateChildren(child.props.children, glossary, used) })
        : child
  );
}

export default function StoryMarkdown({
  children,
  glossary
}: {
  children: string;
  glossary: GlossaryMap;
}) {
  const used = new Set<string>();
  return (
    <ReactMarkdown
      components={{
        h1: () => null,
        h2: ({ children }) => <h2 id={headingId(plainText(children))}>{children}</h2>,
        p: ({ children }) => <p>{decorateChildren(children, glossary, used)}</p>,
        em: ({ children }) => <em>{children}</em>,
        hr: () => (
          <div className="scene-break" aria-hidden="true">
            <span>•</span>
          </div>
        )
      }}
    >
      {normalizeMarkdown(children)}
    </ReactMarkdown>
  );
}
