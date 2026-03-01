/**
 * Interceptor pipeline for @liteforge/client
 *
 * Request interceptors run in insertion order (FIFO).
 * Response interceptors run in reverse insertion order (LIFO) — Axios-style.
 */

import type { InterceptorHandlers, RequestConfig, ResponseContext } from './types.js';
import type { ApiError } from './errors.js';

export interface InterceptorRegistry {
  add: (handlers: InterceptorHandlers) => () => void;
  runRequest: (config: RequestConfig) => Promise<RequestConfig>;
  runResponse: (response: ResponseContext<unknown>) => Promise<ResponseContext<unknown>>;
  runRequestError: (error: unknown) => Promise<never>;
  runResponseError: (error: ApiError) => Promise<never>;
}

export function createInterceptorRegistry(): InterceptorRegistry {
  const handlers: InterceptorHandlers[] = [];

  function add(h: InterceptorHandlers): () => void {
    handlers.push(h);
    return () => {
      const idx = handlers.indexOf(h);
      if (idx !== -1) handlers.splice(idx, 1);
    };
  }

  async function runRequest(config: RequestConfig): Promise<RequestConfig> {
    let current = config;
    for (const h of handlers) {
      if (h.onRequest) {
        current = await h.onRequest(current);
      }
    }
    return current;
  }

  async function runResponse(response: ResponseContext<unknown>): Promise<ResponseContext<unknown>> {
    let current = response;
    // LIFO order for response interceptors
    for (let i = handlers.length - 1; i >= 0; i--) {
      const h = handlers[i];
      if (h !== undefined && h.onResponse) {
        current = await h.onResponse(current);
      }
    }
    return current;
  }

  async function runRequestError(error: unknown): Promise<never> {
    for (const h of handlers) {
      if (h.onRequestError) {
        return h.onRequestError(error);
      }
    }
    throw error;
  }

  async function runResponseError(error: ApiError): Promise<never> {
    for (const h of handlers) {
      if (h.onResponseError) {
        return h.onResponseError(error);
      }
    }
    throw error;
  }

  return { add, runRequest, runResponse, runRequestError, runResponseError };
}
