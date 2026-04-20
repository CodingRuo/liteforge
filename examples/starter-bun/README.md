# starter-bun

Minimal LiteForge app built with Bun's native bundler — no Vite.

## Dev

```sh
bun run dev
```

Starts a dev server at http://localhost:3000. Rebuilds on every request (no HMR in v0.1).

## Build

```sh
bun run build
```

Produces a deployable `dist/` directory. Serve with any static host:

```sh
bunx serve dist/
```

## What this demonstrates

- LiteForge JSX transform via `@liteforge/bun-plugin`
- Client-side routing with `@liteforge/router` (2 routes: `/` and `/about`)
- Form with submit via `@liteforge/form`
- Toast notifications via `@liteforge/toast`
- CSS loaded via static import
