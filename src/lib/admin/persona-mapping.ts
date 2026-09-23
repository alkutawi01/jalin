/**
 * Canonical Persona Mapping
 *
 * Maps AI provider/model families to public editorial personas.
 * Public identity and technical identity MUST remain separate.
 *
 * Canonical personas:
 *   OpenAI/ChatGPT → Rafiq Naim
 *   Anthropic/Claude → Nara Zahin
 *   MiMo/OpenCode → Amir Syafiq
 *   Human owner/editor → Izzat Anas
 *
 * SECURITY: Never expose provider/model/tool names publicly.
 */

export type ProviderFamily =
  | "openai"
  | "anthropic"
  | "mimo"
  | "opencode"
  | "unknown";

export interface PersonaMapping {
  providerFamily: ProviderFamily;
  publicPersona: string;
  actualRole: string;
  description: string;
}

/**
 * Canonical persona registry.
 * Admin can override; unknown provider must not be assigned a false persona.
 */
const PERSONA_REGISTRY: Record<ProviderFamily, PersonaMapping> = {
  openai: {
    providerFamily: "openai",
    publicPersona: "Rafiq Naim",
    actualRole: "draft_writer",
    description: "Penulis draft cerpen Jalin",
  },
  anthropic: {
    providerFamily: "anthropic",
    publicPersona: "Nara Zahin",
    actualRole: "draft_writer",
    description: "Penulis draft cerpen Jalin",
  },
  mimo: {
    providerFamily: "mimo",
    publicPersona: "Amir Syafiq",
    actualRole: "draft_writer",
    description: "Penulis draft cerpen Jalin",
  },
  opencode: {
    providerFamily: "opencode",
    publicPersona: "Amir Syafiq",
    actualRole: "draft_writer",
    description: "Penulis draft cerpen Jalin",
  },
  unknown: {
    providerFamily: "unknown",
    publicPersona: "",
    actualRole: "",
    description: "Unknown provider — no automatic persona assignment",
  },
};

/**
 * Canonical human identities.
 */
export const HUMAN_IDENTITIES = {
  owner: {
    publicPersona: "Izzat Anas",
    actualRole: "editor_in_chief",
    description: "Pemilik dan penyunting utama Jalin",
  },
} as const;

/**
 * Detect provider family from provider string.
 * Returns "unknown" if not recognized.
 */
export function detectProviderFamily(provider: string | null): ProviderFamily {
  if (!provider) return "unknown";

  const lower = provider.toLowerCase().trim();

  if (lower.includes("openai") || lower.includes("chatgpt") || lower.includes("gpt")) {
    return "openai";
  }
  if (lower.includes("anthropic") || lower.includes("claude")) {
    return "anthropic";
  }
  if (lower.includes("mimo")) {
    return "mimo";
  }
  if (lower.includes("opencode")) {
    return "opencode";
  }

  return "unknown";
}

/**
 * Get canonical persona mapping for a provider family.
 * Returns the unknown mapping (empty persona) for unrecognized providers.
 */
export function getPersonaMapping(providerFamily: ProviderFamily): PersonaMapping {
  return PERSONA_REGISTRY[providerFamily] ?? PERSONA_REGISTRY.unknown;
}

/**
 * Resolve public persona from provider string.
 * Returns empty string for unknown providers (no false persona assignment).
 */
export function resolvePublicPersona(provider: string | null): string {
  const family = detectProviderFamily(provider);
  return PERSONA_REGISTRY[family]?.publicPersona ?? "";
}

/**
 * Get all registered persona mappings (for admin inspection).
 */
export function listPersonaMappings(): PersonaMapping[] {
  return Object.values(PERSONA_REGISTRY);
}

/**
 * Check if a provider family has a known persona.
 */
export function hasKnownPersona(provider: string | null): boolean {
  const family = detectProviderFamily(provider);
  return family !== "unknown" && PERSONA_REGISTRY[family].publicPersona !== "";
}

/**
 * Manual persona override record.
 * Used when admin corrects persona mapping.
 */
export interface PersonaOverride {
  providerFamily: ProviderFamily;
  originalPersona: string;
  overriddenPersona: string;
  overriddenBy: string;
  overriddenAt: string;
  reason: string;
}

/**
 * Validate that a persona name is safe for public display.
 * Rules: non-empty, no provider/model keywords, no tool names.
 */
export function isValidPublicPersona(persona: string): boolean {
  if (!persona || persona.trim().length === 0) return false;

  const lower = persona.toLowerCase();

  // Reject if contains provider/model keywords
  const forbidden = [
    "openai", "anthropic", "mimo", "opencode", "chatgpt", "claude",
    "gpt-4", "gpt-3", "gpt4", "gpt3", "sonnet", "haiku", "opus",
    "api", "model", "provider", "tool", "system", "assistant",
  ];

  for (const word of forbidden) {
    if (lower.includes(word)) return false;
  }

  return true;
}
