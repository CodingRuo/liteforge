---
"@liteforge/client": minor
---

feat(client): add @liteforge/client package v0.1.0

TypeScript-first HTTP client with:
- `createClient(config)` — typed client instance with `get/post/put/patch/delete`
- `client.resource<T>(name)` — strongly-typed CRUD (getList, getOne, create, update, patch, delete, action, custom)
- Interceptor pipeline — FIFO for requests, LIFO for responses (Axios-style)
- Middleware pipeline — compose-style wrapping around fetch
- `ApiError` — typed error with `status`, `statusText`, `data`, `config`, `retry()`
- Exponential backoff retry — no retry on 4xx, retries on 5xx + network errors
- Optional `@liteforge/query` integration via `query` option on `createClient`
- Zero external runtime dependencies
