/**
 * Jalin Visual House Style — canonical default style profile.
 *
 * Editable/default style profile. Not hard-coded into every prompt;
 * composed once and prepended to visual generation prompts.
 */

export interface HouseStyleProfile {
  name: string;
  version: string;
  styleDirection: string;
  prioritize: string[];
  avoid: string[];
}

export const JALIN_HOUSE_STYLE: HouseStyleProfile = {
  name: "jalin-house-style",
  version: "1.0",
  styleDirection: [
    "Soft cinematic editorial illustration",
    "semi-realistic digital painting",
    "subtle anime influence",
    "warm muted palette",
    "gentle natural or golden-hour lighting",
    "calm atmospheric depth",
    "elegant literary mood",
    "natural proportions",
    "clean painterly edges",
    "subtle paper-like texture",
    "premium magazine/book illustration quality",
  ].join(", "),
  prioritize: [
    "composition",
    "posture",
    "objects",
    "environment",
    "emotional restraint",
    "negative space",
    "realistic Malaysian context where relevant",
  ],
  avoid: [
    "photorealism",
    "glossy 3D",
    "chibi/cartoon",
    "comic-book line art",
    "exaggerated anime features",
    "neon colors",
    "oversaturation",
    "clutter",
    "decorative graphic effects",
    "generic stock-art appearance",
  ],
};

/**
 * Jalin's own standards (docs/VISUAL_GENERATION_GUARDRAILS.md, AGENTS.md). They are added to EVERY image
 * prompt by the system, so a chatbot's scene description can be short or incomplete and the image still follows them.
 */
export const JALIN_VISUAL_STANDARDS = {
  version: "1.1",
  faces:
    "Faces: no human face is clearly visible. Show people from behind, in silhouette, in partial profile, obscured by a foreground object, or cropped at the shoulders, hands or torso; use depth of field so no face can be identified.",
  sceneTruth:
    "Scene truth: show only what the scene describes, at that exact moment of the story. Do not add people, objects, places, weather or events that are not described.",
  anatomy:
    "Anatomy: natural hands and limbs, correct number of fingers, no extra or merged limbs, objects held naturally and never fused with the body.",
  continuity:
    "Continuity: recurring characters, clothing and symbolic objects keep one consistent appearance across images, exactly as the story describes them; do not invent ethnicity, age, hairstyle or body type that the story does not state.",
  setting: "Setting: realistic Malaysian context where the story implies it. Do not name any art style or artist."
} as const;

export const SUPPORTED_ASPECT_RATIOS = ["1:1", "3:2", "2:3", "16:9", "9:16", "4:3", "3:4"] as const;

export function aspectRatioToDimensions(aspectRatio: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "3:2": { width: 1536, height: 1024 },
    "2:3": { width: 1024, height: 1536 },
    "16:9": { width: 1536, height: 864 },
    "9:16": { width: 864, height: 1536 },
    "4:3": { width: 1365, height: 1024 },
    "3:4": { width: 1024, height: 1365 },
  };
  return map[aspectRatio] ?? map["3:2"];
}
