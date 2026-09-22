import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { GlossaryMap } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}

function mergeLines(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const sections = normalized.split("\n***\n");
  return sections.map((section) => {
    const lines = section.split("\n");
    const result: string[] = [];
    let paragraph: string[] = [];

    for (const line of lines) {
      if (line.trim() === "") {
        if (paragraph.length > 0) {
          result.push(paragraph.join(" "));
          paragraph = [];
        }
      } else {
        paragraph.push(line);
      }
    }

    if (paragraph.length > 0) {
      result.push(paragraph.join(" "));
    }

    return result.join("\n");
  }).join("\n\n***\n\n");
}

function GlossaryTerm({
  term,
  glossary,
  children
}: {
  term: string;
  glossary: GlossaryMap;
  children: ReactNode;
}) {
  const item = glossary[term];

  return (
    <span className="glossary-term" tabIndex={0}>
      {children}
      <span className="glossary-tooltip" role="tooltip">
        <strong>{term}</strong>
        <span>{item.meaning}</span>
        <small>{item.source}</small>
      </span>
    </span>
  );
}

function decorateGlossary(text: string, glossary: GlossaryMap): ReactNode[] {
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  if (terms.length === 0) return [text];

  const pattern = new RegExp("(" + terms.map(escapeRegExp).join("|") + ")", "gi");

  return text.split(pattern).map((part, index) => {
    const key = terms.find((term) => term.toLowerCase() === part.toLowerCase());
    if (!key) return part;

    return (
      <GlossaryTerm key={part + "-" + index} term={key} glossary={glossary}>
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
        p: ({ children }) => <p>{decorateChildren(children, glossary)}</p>,
        em: ({ children }) => <em>{decorateChildren(children, glossary)}</em>,
        hr: () => (
          <div className="scene-break" aria-hidden="true">
            <span>•</span>
          </div>
        )
      }}
    >
      {mergeLines(children)}
    </ReactMarkdown>
  );
}
