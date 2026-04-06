# LiteForge Docs

Machine-readable documentation for the LiteForge frontend framework.
Structured for MCP (Model Context Protocol) consumption.

## Navigation

See [index.json](./index.json) for the full page manifest.

## Framework Overview

LiteForge is a signals-based frontend framework with no Virtual DOM.
Direct DOM updates via signals — performance between VanillaJS and SolidJS.

## Package Overview

| Package | Install | Description |
|---------|---------|-------------|
| `liteforge` | `npm i liteforge` | Umbrella: core + runtime only |
| `@liteforge/core` | `npm i @liteforge/core` | Signals, effects, computed |
| `@liteforge/runtime` | `npm i @liteforge/runtime` | JSX runtime, context, DOM rendering |
| `@liteforge/router` | `npm i @liteforge/router` | Client-side routing |
| `@liteforge/store` | `npm i @liteforge/store` | Global state management |
| `@liteforge/query` | `npm i @liteforge/query` | Data fetching + caching |
| `@liteforge/form` | `npm i @liteforge/form` | Forms + Zod validation |
| `@liteforge/table` | `npm i @liteforge/table` | Reactive data grid |
| `@liteforge/flow` | `npm i @liteforge/flow` | Node editor (signals-based) |
| `@liteforge/calendar` | `npm i @liteforge/calendar` | Calendar + drag & drop |
| `@liteforge/modal` | `npm i @liteforge/modal` | Modal system |
| `@liteforge/toast` | `npm i @liteforge/toast` | Toast notifications |
| `@liteforge/tooltip` | `npm i @liteforge/tooltip` | Tooltip |
| `@liteforge/i18n` | `npm i @liteforge/i18n` | Internationalization |
| `@liteforge/devtools` | `npm i @liteforge/devtools` | DevTools panel |
| `@liteforge/vite-plugin` | `npm i @liteforge/vite-plugin` | Vite JSX transform |
| `@liteforge/admin` | `npm i @liteforge/admin` | Admin UI builder |

## Design Principles

- No Virtual DOM — signals drive DOM updates directly
- `create*` naming convention for all factory functions
- Fully controlled patterns (nodes/edges/form-values as props)
- Zero `any` types in public APIs
- Object-style options (no positional args)
