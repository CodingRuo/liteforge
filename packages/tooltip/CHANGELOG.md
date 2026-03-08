# @liteforge/tooltip

## 0.2.0

### Minor Changes

- New package: `@liteforge/tooltip`

  Portal-based tooltip primitive that renders directly on `<body>` to avoid `overflow:hidden` / z-index clipping from parent containers.

  **API:**

  - `tooltip(el, input)` — imperative function, attaches to any `HTMLElement` via ref-callback, returns a cleanup function
  - `Tooltip(props)` — plain factory wrapper for JSX usage (`display:contents` span)
  - `showWhen: () => boolean` — conditional guard (e.g. only show when sidebar is collapsed)
  - `position: 'top' | 'right' | 'bottom' | 'left' | 'auto'` — auto flips to avoid viewport edges
  - `delay`, `offset`, `disabled` options
  - CSS variables for full theming, `::before` arrow via `[data-position]`
  - Zero runtime dependencies
