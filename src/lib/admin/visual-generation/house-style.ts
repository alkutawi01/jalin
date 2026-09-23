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
