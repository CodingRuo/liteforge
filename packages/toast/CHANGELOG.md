# @liteforge/toast

## 6.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@1.0.0

## 5.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.9.0

## 4.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.8.0

## 3.2.0

### Minor Changes

- 58d4037: feat(toast): add custom icon support via `icons` prop on ToastProvider and per-toast `icon` option (#61)

  - `ToastProvider` accepts `icons?: ToastIcons` — override built-in SVGs per type (`success`, `error`, `warning`, `info`)
  - Per-toast: `toast.success('msg', { icon: '<svg ...>' })`
  - `ToastIcon` type: `string | Node | (() => Node)`
  - Resolution order: per-toast `icon` → provider `icons[type]` → built-in default
  - New exports: `ToastIcon`, `ToastIcons`

## 3.1.0

### Minor Changes

- 0d5d117: feat(toast): add `styles` and `classes` config props to `ToastProvider` and per-toast options (#59)

  - `ToastProvider` now accepts `styles` (inline CSS per part: container/toast/icon/close) and `classes` (extra class names per part and per type)
  - Per-toast: `toast.success('msg', { class: 'my-toast', styles: { toast: 'min-width: 300px;' } })`
  - Provider-level styles are applied first; per-toast overrides layer on top
  - New exports: `ToastStyles`, `ToastClasses`, `ToastProviderOptions`

### Patch Changes

- Updated dependencies [0d5d117]
  - @liteforge/runtime@0.7.4

## 3.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.7.0

## 2.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.0

## 1.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.5.0

## 0.2.0

### Minor Changes

- Add `@liteforge/toast` — signals-based toast notification package.
  Imperative API (`toast.success/error/warning/info/promise/dismiss/dismissAll`),
  signal store, `ToastProvider` DOM component with 6 positions, pause-on-hover,
  auto-dismiss, CSS-first with `?url` import pattern, `toastPlugin()` with
  `PluginRegistry` declaration merging. Available as `liteforge/toast`.
