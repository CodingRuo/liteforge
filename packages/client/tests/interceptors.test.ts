/**
 * @liteforge/client — interceptor tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createInterceptorRegistry } from '../src/interceptors.js';
import { ApiError } from '../src/errors.js';
import type { RequestConfig, ResponseContext } from '../src/types.js';

const baseConfig: RequestConfig = { method: 'GET', url: '/test' };

function makeContext<T = unknown>(data: T): ResponseContext<T> {
  return { data, status: 200, statusText: 'OK', headers: new Headers(), config: baseConfig };
}

describe('InterceptorRegistry', () => {
  it('onRequest is called with config and returned config is used', async () => {
    const registry = createInterceptorRegistry();
    registry.add({
      onRequest: (cfg) => ({ ...cfg, headers: { 'x-token': 'abc' } }),
    });

    const result = await registry.runRequest(baseConfig);
    expect(result.headers?.['x-token']).toBe('abc');
  });

  it('onResponse is called with response and returned value is used', async () => {
    const registry = createInterceptorRegistry();
    registry.add({
      onResponse: <T>(ctx: ResponseContext<T>) => ({ ...ctx, status: 201 }),
    });

    const result = await registry.runResponse(makeContext('hello'));
    expect(result.status).toBe(201);
  });

  it('onRequestError is called when it throws', async () => {
    const registry = createInterceptorRegistry();
    const onReqErr = vi.fn().mockImplementation(() => { throw new Error('intercepted'); });

    registry.add({ onRequestError: onReqErr });

    await expect(registry.runRequestError(new Error('original'))).rejects.toThrow('intercepted');
    expect(onReqErr).toHaveBeenCalledOnce();
  });

  it('onResponseError is called on ApiError', async () => {
    const registry = createInterceptorRegistry();
    const apiErr = new ApiError({ status: 401, statusText: 'Unauthorized', data: null, config: baseConfig, retry: async () => makeContext(null) });

    const handler = vi.fn().mockImplementation((e: unknown) => { throw e; });
    registry.add({ onResponseError: handler });

    await expect(registry.runResponseError(apiErr)).rejects.toThrow(ApiError);
    expect(handler).toHaveBeenCalledWith(apiErr);
  });

  it('request interceptors run in FIFO order', async () => {
    const registry = createInterceptorRegistry();
    const order: number[] = [];

    registry.add({ onRequest: (cfg) => { order.push(1); return cfg; } });
    registry.add({ onRequest: (cfg) => { order.push(2); return cfg; } });

    await registry.runRequest(baseConfig);
    expect(order).toEqual([1, 2]);
  });

  it('response interceptors run in LIFO order', async () => {
    const registry = createInterceptorRegistry();
    const order: number[] = [];

    registry.add({ onResponse: <T>(ctx: ResponseContext<T>) => { order.push(1); return ctx; } });
    registry.add({ onResponse: <T>(ctx: ResponseContext<T>) => { order.push(2); return ctx; } });

    await registry.runResponse(makeContext('test'));
    expect(order).toEqual([2, 1]);
  });

  it('remove function removes only that interceptor', async () => {
    const registry = createInterceptorRegistry();
    const onRequest1 = vi.fn((cfg: RequestConfig) => cfg);
    const onRequest2 = vi.fn((cfg: RequestConfig) => cfg);

    const remove1 = registry.add({ onRequest: onRequest1 });
    registry.add({ onRequest: onRequest2 });

    remove1();

    await registry.runRequest(baseConfig);
    expect(onRequest1).not.toHaveBeenCalled();
    expect(onRequest2).toHaveBeenCalledOnce();
  });
});
