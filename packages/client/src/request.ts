/**
 * Core fetch execution for @liteforge/client
 */

import { ApiError } from './errors.js';
import type { RequestConfig, ResponseContext } from './types.js';
import { appendQueryParams } from './utils/url.js';

/**
 * Executes a fetch request described by `config` and returns a typed
 * `ResponseContext`. Throws `ApiError` on non-2xx responses.
 */
export async function executeFetch<T>(config: RequestConfig): Promise<ResponseContext<T>> {
  // 1. Build full URL
  let url = config.url;
  if (config.params !== undefined && Object.keys(config.params).length > 0) {
    url = appendQueryParams(url, config.params);
  }

  // 2. Construct headers (always lowercase keys for consistency)
  const headersInit: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.headers ?? {})) {
    headersInit[key.toLowerCase()] = value;
  }

  // 3. Build body
  let body: BodyInit | null = null;
  if (config.body !== undefined) {
    if (typeof config.body === 'string') {
      body = config.body;
    } else {
      body = JSON.stringify(config.body);
      // 4. Auto-set Content-Type if not already present
      if (headersInit['content-type'] === undefined) {
        headersInit['content-type'] = 'application/json';
      }
    }
  }

  // 5. Timeout via AbortController
  const controller = new AbortController();
  const timeoutMs = config.timeout ?? 30_000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Merge with any external signal
  const signal = config.signal
    ? mergeAbortSignals(config.signal, controller.signal)
    : controller.signal;

  const init: RequestInit = {
    method: config.method,
    headers: headersInit,
    body,
    signal,
  };

  let response: Response;

  try {
    // 6. Execute fetch — network errors propagate as-is
    response = await fetch(url, init);
  } finally {
    clearTimeout(timeoutId);
  }

  // 7. Parse body (try JSON first, fall back to text)
  const rawData = await parseBody(response);

  // 8. Throw ApiError on non-2xx
  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      statusText: response.statusText,
      data: rawData,
      config,
      retry: () => executeFetch(config),
    });
  }

  // 9. Return ResponseContext
  return {
    data: rawData as T,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    config,
  };
}

// ============================================================================
// Helpers
// ============================================================================

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json() as unknown;
    } catch {
      return null;
    }
  }
  // For empty bodies (e.g. 204 No Content) json() would fail; use text
  const text = await response.text();
  if (text === '') return null;

  // Try to parse as JSON anyway (some APIs omit the content-type header)
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Merges two AbortSignals: abort fires when either fires.
 * Uses AbortSignal.any() if available (Node 20+), otherwise falls back.
 */
function mergeAbortSignals(external: AbortSignal, internal: AbortSignal): AbortSignal {
  if ('any' in AbortSignal && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([external, internal]);
  }

  // Fallback: create a controller that mirrors both
  const controller = new AbortController();

  const abort = () => controller.abort();

  if (external.aborted || internal.aborted) {
    controller.abort();
  } else {
    external.addEventListener('abort', abort, { once: true });
    internal.addEventListener('abort', abort, { once: true });
  }

  return controller.signal;
}
