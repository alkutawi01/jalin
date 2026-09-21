import React, { type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { GlossaryMap } from "./types";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
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
        em: ({ children }) => <em>{decorateChildren(children, glossary)}</em>
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
