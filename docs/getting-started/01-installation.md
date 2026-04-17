---
title: "Installation"
category: "getting-started"
tags: ["install", "setup", "npm", "pnpm", "create-liteforge"]
related: ["Quick Start", "Core Concepts"]
---

# Installation

> Set up LiteForge in a new or existing project.

## Installation

```bash
npm install liteforge
```

Install individual packages as needed:

```bash
npm install @liteforge/core @liteforge/runtime @liteforge/vite-plugin
npm install @liteforge/router @liteforge/store @liteforge/query
npm install @liteforge/form @liteforge/table @liteforge/calendar
npm install @liteforge/modal @liteforge/toast @liteforge/tooltip
npm install @liteforge/i18n @liteforge/devtools @liteforge/flow
npm install @liteforge/admin
```

## Quick Start

```bash
# Scaffold a new project
npm create liteforge@latest my-app
cd my-app
npm install
npm run dev
```

## API Reference

### Package list

| Package | Purpose |
|---------|---------|
| `liteforge` | Umbrella re-export: `@liteforge/core` + `@liteforge/runtime` |
| `@liteforge/core` | `signal`, `computed`, `effect`, `batch`, `onCleanup` |
| `@liteforge/runtime` | `defineComponent`, `defineApp`, `Show`, `For`, `Switch` |
| `@liteforge/vite-plugin` | Vite plugin for JSX transform + HMR |
| `@liteforge/router` | Client-side routing with guards and middleware |
| `@liteforge/store` | Global reactive state with `defineStore` |
| `@liteforge/query` | Data fetching with `createQuery` / `createMutation` |
| `@liteforge/form` | Form management with Zod validation |
| `@liteforge/table` | Reactive data grid |
| `@liteforge/flow` | Node-graph editor |
| `@liteforge/calendar` | Scheduling calendar with drag & drop |
| `@liteforge/modal` | Modal dialogs |
| `@liteforge/toast` | Toast notifications |
| `@liteforge/tooltip` | Element tooltips |
| `@liteforge/i18n` | Internationalization |
| `@liteforge/devtools` | Debug panel with time-travel |
| `@liteforge/admin` | Admin UI builder |

## Examples

### Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()],
})
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@liteforge/runtime",
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Notes

- LiteForge requires Vite and the `@liteforge/vite-plugin` for JSX transform.
- All packages have zero external runtime dependencies — only `@liteforge/core` is a peer dependency.
- TypeScript strict mode is required. `exactOptionalPropertyTypes: true` is recommended.
