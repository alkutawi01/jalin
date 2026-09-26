export interface ValidationEntryError {
  file: string;
  field: string;
  message: string;
}

export function isDerivativeEntry(data: Record<string, unknown>): boolean;

export function validateFrontmatter(
  data: Record<string, unknown>,
  fileName: string,
  slugs?: Set<string>
): ValidationEntryError[];
