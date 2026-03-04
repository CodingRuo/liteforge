/**
 * @liteforge/i18n — Key resolution, interpolation, pluralization
 */

import type { InterpolationParams, TranslationTree } from './types.js';

/**
 * Resolves a dot-notation key from a translation tree.
 * Returns undefined if the key path doesn't exist or points to a subtree.
 */
export function resolveKey(tree: TranslationTree, key: string): string | undefined {
  const parts = key.split('.');
  let node: TranslationTree | string = tree;

  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    const next = (node as TranslationTree)[part];
    if (next === undefined) return undefined;
    node = next as TranslationTree | string;
  }

  return typeof node === 'string' ? node : undefined;
}

/**
 * Replaces `{param}` placeholders with values from params.
 */
export function interpolate(template: string, params?: InterpolationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/**
 * Resolves plural form from a pipe-separated string.
 *
 * Supports two formats:
 *   - 2 parts:  "singular | plural"         — 1 → singular, else → plural
 *   - 3 parts:  "zero | one | many"          — 0 → zero, 1 → one, else → many
 */
export function resolvePlural(template: string, count: number): string {
  if (!template.includes('|')) return template;

  const parts = template.split('|').map(p => p.trim());
  const [zero, one, many] = parts;

  if (parts.length === 2) {
    return count === 1 ? (zero ?? template) : (one ?? template);
  }

  if (parts.length >= 3) {
    if (count === 0) return zero ?? template;
    if (count === 1) return one ?? template;
    return many ?? template;
  }

  return template;
}
