import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { GlossaryMap } from "./types";
import { headingId } from "../../lib/reader/inline-chapters";
import GlossaryTerm from "./GlossaryTerm";

function plainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(plainText).join("");
  if (React.isValidElement(node)) return plainText((node.props as { children?: ReactNode }).children);
  return "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

function normalizeMarkdown(markdown: string): string {
  // Preserve editorial paragraph boundaries exactly as authored.
  // Markdown uses blank lines (\n\n) to delimit paragraphs; collapsing them
  // here would turn an entire scene into a single paragraph.
  return markdown.replace(/\r\n/g, "\n");
}

function decorateGlossary(text: string, glossary: GlossaryMap): ReactNode[] {
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return [text];

  const pattern = new RegExp("(" + terms.map(escapeRegExp).join("|") + ")", "gi");

  return text.split(pattern).map((part, index) => {
    const key = terms.find((term) => term.toLowerCase() === part.toLowerCase());
    if (!key) return part;

    return (
      <GlossaryTerm key={part + "-" + index} term={key} meaning={glossary[key].meaning}>
        {part}
      </GlossaryTerm>
    );
  });
}

function decorateChildren(children: ReactNode, glossary: GlossaryMap): ReactNode {
  return React.Children.map(children, (child) =>
    typeof child === "string" ? decorateGlossary(child, glossary) : child
  );
}

export default function StoryMarkdown({
  children,
  glossary
}: {
  children: string;
  glossary: GlossaryMap;
}) {
  return (
    <ReactMarkdown
      components={{
        h1: () => null,
        h2: ({ children }) => <h2 id={headingId(plainText(children))}>{children}</h2>,
        p: ({ children }) => <p>{decorateChildren(children, glossary)}</p>,
        em: ({ children }) => <em>{decorateChildren(children, glossary)}</em>,
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
