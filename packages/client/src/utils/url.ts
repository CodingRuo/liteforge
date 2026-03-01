/**
 * URL utilities for @liteforge/client
 */

/**
 * Joins a base URL and a path, normalising slashes so there is exactly
 * one `/` between them and no trailing slash is added.
 */
export function buildUrl(base: string, path: string): string {
  const trimmedBase = base.replace(/\/+$/, '');
  const trimmedPath = path.replace(/^\/+/, '');

  if (trimmedPath === '') {
    return trimmedBase;
  }

  return `${trimmedBase}/${trimmedPath}`;
}

/**
 * Appends a params object to a URL as a query string.
 * `undefined` / `null` values are skipped.
 */
export function appendQueryParams(
  url: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  }

  const qs = search.toString();
  if (qs === '') return url;

  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}
