---
"@liteforge/vite-plugin": patch
---

fix(@liteforge/vite-plugin): <For> and <Show> JSX tag syntax now correctly transforms each/when/children (#49, #50)

The `for-transform` visitor previously only matched `For({...})` and `Show({...})`
as direct function-call expressions (`CallExpression`). When written as JSX tags
(`<For each={...}>`, `<Show when={...}>`), the visitor did not run — leaving `each`
and `when` un-wrapped and the children callback item parameter un-rewritten.

**Before (broken):**
```tsx
<For each={items()}>
  {(item) => <li>{item.name}</li>}  // item was () => T, not plain T
</For>

<Show when={isVisible()}>
  {() => <div>Content</div>}        // when was not wrapped in getter
</Show>
```

**After (fixed):**
Both syntaxes produce identical runtime output:
- `each={items()}` → `each: () => items()`
- `when={cond()}` → `when: () => cond()`
- `item.name` inside children → `() => item().name`

The `For({...})` / `Show({...})` function-call syntax continues to work unchanged.
