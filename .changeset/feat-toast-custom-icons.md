---
"@liteforge/toast": minor
---

feat(toast): add custom icon support via `icons` prop on ToastProvider and per-toast `icon` option (#61)

- `ToastProvider` accepts `icons?: ToastIcons` — override built-in SVGs per type (`success`, `error`, `warning`, `info`)
- Per-toast: `toast.success('msg', { icon: '<svg ...>' })`
- `ToastIcon` type: `string | Node | (() => Node)`
- Resolution order: per-toast `icon` → provider `icons[type]` → built-in default
- New exports: `ToastIcon`, `ToastIcons`
