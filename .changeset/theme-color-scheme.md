---
"@liteforge/theme": minor
---

feat(@liteforge/theme): colorScheme() signal for reactive dark/light mode toggle (#52)

Export `colorScheme()` — a singleton `Signal<'light' | 'dark'>` that:
- Initialises from `localStorage` → `prefers-color-scheme` → `'light'`
- Applies `data-theme` to `<html>` synchronously on first call (no FOUC)
- Persists every change to `localStorage` under `'lf-theme'`
- Works alongside Tailwind v3 `dark:` variant (add a `.dark` class toggle via `effect()`)

```ts
import { colorScheme } from '@liteforge/theme';

const scheme = colorScheme();
scheme()                        // 'light' | 'dark'
scheme.set('dark');
scheme.update(s => s === 'dark' ? 'light' : 'dark');  // toggle
```
