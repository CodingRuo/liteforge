/**
 * Header utilities for @liteforge/client
 */

/**
 * Merges multiple header records into one. Later sources override earlier ones.
 * All keys are lowercased for consistency.
 */
export function mergeHeaders(
  ...sources: Array<Record<string, string> | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const source of sources) {
    if (source === undefined) continue;
    for (const [key, value] of Object.entries(source)) {
      result[key.toLowerCase()] = value;
    }
  }

  return result;
}
