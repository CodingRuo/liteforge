# create-liteforge

## 0.2.1

### Patch Changes

- 9ec3ace: Fix scaffold template: add missing `@liteforge/store` dependency and wire `uiStore` in `App.tsx`

  - `package.json`: add `@liteforge/store ^0.1.0` (was missing; `stores/ui.ts` imports `defineStore` from it)
  - `App.tsx`: import `uiStore` and add a theme-toggle button that uses `effectiveTheme` getter and `setTheme` action, demonstrating the store pattern in the scaffold
  - `styles.css`: add `.theme-toggle` button styles

## 0.2.0

### Minor Changes

- Update template to current package conventions and CLI cleanup.

  **Wave 1 — Template fixes:**

  - Migrate all `liteforge/*` sub-path imports to `@liteforge/*` scoped packages (`@liteforge/router`, `@liteforge/modal`, `@liteforge/vite-plugin`)
  - Bump `liteforge` to `^0.7.6`, add explicit `@liteforge/router`, `@liteforge/modal`, `@liteforge/vite-plugin` dependencies
  - Add `src/stores/ui.ts` with `defineStore` pattern
  - Update router bootstrap to `routerPlugin()` via `.use()` (plugin system)
  - Add `jsxImportSource: liteforge` to template `tsconfig.json`

  **Wave 2 — Cleanup:**

  - Default package manager changed from `pnpm` to `npm`
  - Fix `_gitignore` → `.gitignore` rename consistency for npm publish
  - Add README and LICENSE to CLI package

## 0.1.3

### Patch Changes

- 18d63ea: Update scaffolded template to current patterns: `createBrowserHistory` + `createRouter`, named page exports, `meta: { title }` on routes
