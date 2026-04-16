# @liteforge/i18n

## 4.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.8.0

## 3.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.7.0

## 2.1.0

### Minor Changes

- **Per-key TypeScript safety — `createI18n<T>()` is now generic**

  Pass your locale type to `createI18n` and `t()` will only accept valid dot-notation keys. Typos become TypeScript errors at compile time — no codegen, no build step.

  ```ts
  import type en from "./locales/en.js";

  const i18n = createI18n<typeof en>({
    defaultLocale: "en",
    fallbackLocale: "en",
    load: async (locale) => (await import(`./locales/${locale}.js`)).default,
  });

  const { t } = i18n;

  t("overview.title"); // ✓
  t("overview.titlee"); // TS Error — not a valid key
  t("nav.app"); // ✓
  ```

  **Fully non-breaking:** Without a type argument, `t()` accepts any `string` — identical to the previous behavior. `ExtractKeys<Record<string, string>>` resolves to `string`, preserving the untyped fallback.

  **New type export: `ExtractKeys<T>`** — recursively extracts all dot-notation leaf keys from a translation object. Same principle as `ExtractRoutePaths<T>` in the router.

  ```ts
  import type { ExtractKeys } from "@liteforge/i18n";

  type MyKeys = ExtractKeys<typeof en>;
  // → 'nav.app' | 'nav.core' | 'overview.title' | 'overview.subtitle' | ...
  ```

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

- feat(@liteforge/i18n): new signals-based internationalization plugin

  - Lazy-loaded locale files via async `load()` function
  - Dot-notation keys (`t('nav.home')`)
  - `{param}` interpolation
  - Pipe-based pluralization: `singular | plural` (2-part) and `zero | one | many` (3-part)
  - Fallback locale — loaded in parallel at startup, transparently used for missing keys
  - localStorage persistence with configurable key
  - No re-render on locale switch — only text nodes that call `t()` update
  - Async plugin install (`i18nPlugin`) awaits initial locale before app mounts (prevents FOUC)
  - Full TypeScript strictness, zero external dependencies

  feat(liteforge): add `liteforge/i18n` sub-path export

  patch(@liteforge/runtime): support async plugin `install()` return value (`Promise<void | (() => void)>`)

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.4.2
