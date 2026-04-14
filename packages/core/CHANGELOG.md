# @liteforge/core

## 0.1.1

### Patch Changes

- feat(@liteforge/core): add untrack() (#47)

  Export `untrack(fn)` from `@liteforge/core`. Executes `fn` without tracking
  any signal reads, so writes inside an effect that would otherwise create an
  infinite reactive loop are now safe. Common use case: prefilling a form from
  async query data — `effect(() => { const d = q.data(); if (d) untrack(() => form.setValues(d)); })`.
