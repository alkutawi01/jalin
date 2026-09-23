/**
 * Visual prompt composer.
 *
 * Composes final generation prompt from:
 * house style → work/submission context → scene instruction → visual role → aspect ratio
 *
 * Prompt provenance is auditable. Raw prompts are never exposed publicly.
 */

import type { AspectRatio, VisualRole } from "../../db/types";
import { JALIN_HOUSE_STYLE } from "./house-style";

export interface VisualPromptInput {
  sceneInstruction: string;
  role: VisualRole;
  aspectRatio: AspectRatio;
  workTitle?: string | null;
  workType?: string | null;
  editorialOverride?: string | null;
}

export interface ComposedVisualPrompt {
  finalPrompt: string;
  houseStyleVersion: string;
  role: VisualRole;
  aspectRatio: AspectRatio;
  hasEditorialOverride: boolean;
  provenance: {
    houseStyle: string;
    sceneInstruction: string;
    editorialOverride: string | null;
  };
}

const ROLE_HINTS: Record<VisualRole, string> = {
  hero: "Wide establishing hero image, full-bleed composition suitable for a cover or lead visual.",
  inline: "Inline editorial illustration sized for placement within reading column.",
  section: "Section divider illustration, horizontal composition marking a transition.",
  decorative: "Decorative accent illustration, subtle and non-intrusive.",
};

export function composeVisualPrompt(input: VisualPromptInput): ComposedVisualPrompt {
  const parts: string[] = [];

  // 1. House style
  parts.push(`Style: ${JALIN_HOUSE_STYLE.styleDirection}.`);
  parts.push(
    `Prioritize: ${JALIN_HOUSE_STYLE.prioritize.join(", ")}.`
  );
  parts.push(`Avoid: ${JALIN_HOUSE_STYLE.avoid.join(", ")}.`);

  // 2. Work/submission context
  if (input.workTitle) {
    parts.push(`Work context: "${input.workTitle}"${input.workType ? ` (${input.workType})` : ""}.`);
  }

  // 3. Visual role hint
  parts.push(`Role: ${ROLE_HINTS[input.role] ?? ROLE_HINTS.inline}`);

  // 4. Aspect ratio
  parts.push(`Aspect ratio: ${input.aspectRatio}.`);

  // 5. Scene-specific instruction (editorial override replaces if present)
  if (input.editorialOverride && input.editorialOverride.trim()) {
    parts.push(`Scene: ${input.editorialOverride.trim()}`);
  } else {
    parts.push(`Scene: ${input.sceneInstruction}`);
  }

  const finalPrompt = parts.join("\n");

  return {
    finalPrompt,
    houseStyleVersion: JALIN_HOUSE_STYLE.version,
    role: input.role,
    aspectRatio: input.aspectRatio,
    hasEditorialOverride: !!(input.editorialOverride && input.editorialOverride.trim()),
    provenance: {
      houseStyle: `${JALIN_HOUSE_STYLE.name}@${JALIN_HOUSE_STYLE.version}`,
      sceneInstruction: input.sceneInstruction,
      editorialOverride: input.editorialOverride?.trim() || null,
    },
  };
}
