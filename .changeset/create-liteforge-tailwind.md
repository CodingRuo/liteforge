---
"create-liteforge": minor
---

Scaffold template rebuilt with Tailwind CSS v4

- Replace hand-written CSS (~250 lines) with `@tailwindcss/vite` + `@import "tailwindcss"` (3 lines)
- Dark mode via `data-theme="dark"` on `<html>` using `@custom-variant dark` — theme toggle now works correctly
- `uiStore.init()` called on startup to apply initial theme and wire `prefers-color-scheme` listener
- All JSX components rewritten with Tailwind utility classes (App, Home, About)
- Added `@tailwindcss/vite` and `tailwindcss` to devDependencies
