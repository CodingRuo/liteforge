/**
 * Optional @liteforge/query integration for @liteforge/client
 *
 * Provides `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`
 * methods on Resource instances when a QueryIntegration is supplied.
 */

import type {
  QueryResult,
  MutationResult,
  CreateQueryOptions,
  CreateMutationOptions,
} from '@liteforge/query';

import type { RequestConfig, ListParams, ListResponse } from '../types.js';
import { buildUrl } from '../utils/url.js';

export interface QueryIntegration {
  createQuery: <T>(options: CreateQueryOptions<T>) => QueryResult<T>;
  createMutation: <TData, TVariables>(
    options: CreateMutationOptions<TData, TVariables>,
  ) => MutationResult<TData, TVariables>;
}

export interface QueryMethods<T, TCreate, TUpdate> {
  useList: (params?: ListParams) => QueryResult<ListResponse<T>>;
  useOne: (id: string | number) => QueryResult<T>;
  useCreate: () => MutationResult<T, TCreate>;
  useUpdate: () => MutationResult<T, { id: string | number; data: TUpdate }>;
  useDelete: () => MutationResult<void, string | number>;
}

export function buildQueryMethods<T, TCreate, TUpdate>(
  /** Short resource name used as query cache key (e.g. 'users') */
  resourceKey: string,
  /** Full base URL used for fetch requests (e.g. 'https://api.example.com/users') */
  fetchUrl: string,
  request: <R>(config: RequestConfig) => Promise<R>,
  integration: QueryIntegration,
): QueryMethods<T, TCreate, TUpdate> {
  function useList(params?: ListParams): QueryResult<ListResponse<T>> {
    const serialized = JSON.stringify(params ?? {});
    return integration.createQuery<ListResponse<T>>({
      key: () => [resourceKey, 'list', serialized],
      fn: () => {
        const cfg: RequestConfig = { method: 'GET', url: fetchUrl };
        if (params !== undefined) {
          cfg.params = params as Record<string, string | number | boolean>;
        }
        return request<ListResponse<T>>(cfg);
      },
    });
  }

  function useOne(id: string | number): QueryResult<T> {
    return integration.createQuery<T>({
      key: () => [resourceKey, 'one', String(id)],
      fn: () => request<T>({ method: 'GET', url: buildUrl(fetchUrl, String(id)) }),
    });
  }

  function useCreate(): MutationResult<T, TCreate> {
    return integration.createMutation<T, TCreate>({
      fn: (data: TCreate) => request<T>({ method: 'POST', url: fetchUrl, body: data }),
      invalidate: [fetchUrl],
    });
  }

  function useUpdate(): MutationResult<T, { id: string | number; data: TUpdate }> {
    return integration.createMutation<T, { id: string | number; data: TUpdate }>({
      fn: (vars: { id: string | number; data: TUpdate }) =>
        request<T>({ method: 'PUT', url: buildUrl(fetchUrl, String(vars.id)), body: vars.data }),
      invalidate: [fetchUrl],
    });
  }

  function useDelete(): MutationResult<void, string | number> {
    return integration.createMutation<void, string | number>({
      fn: (id: string | number) =>
        request<void>({ method: 'DELETE', url: buildUrl(fetchUrl, String(id)) }),
      invalidate: [fetchUrl],
    });
  }

  return { useList, useOne, useCreate, useUpdate, useDelete };
}
