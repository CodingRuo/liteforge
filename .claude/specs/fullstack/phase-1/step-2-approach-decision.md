# Step 2 Architecture Decision: @liteforge/bun-plugin

## Approaches Evaluated

### Approach A: Single-Function Plugin
```ts
import { liteforgeBunPlugin } from '@liteforge/bun-plugin'
await Bun.build({ plugins: [liteforgeBunPlugin()] })
```
Plugin = one focused `BunPlugin` object wrapping `transformJsx()`. User writes own `build.ts` and `dev.ts`. Full Bun API exposed.

### Approach B: Defined-Build-Object
```ts
import { defineLiteforgeBunBuild } from '@liteforge/bun-plugin'
export default defineLiteforgeBunBuild({ entry: './src/main.tsx', outDir: './dist', port: 3000 })
```
Higher-level helper abstracting `Bun.build` + `Bun.serve` together. User writes only config.

### Approach C: CLI + Plugin Separated
```sh
bunx @liteforge/bun-plugin dev
bunx @liteforge/bun-plugin build
```
Plugin is pure `BunPlugin`. Dev-Server and Build orchestration come from a separate CLI (bin/cli.ts).

## Decision Matrix

| Criterion | A: Single Plugin | B: Build Object | C: CLI |
|---|---|---|---|
| Bun idiom | Native — user sees Bun.build | Hides Bun entirely | Hides via CLI convention |
| vite-plugin consistency | `liteforgeBunPlugin()` mirrors existing pattern | Different name + abstraction level | Different paradigm |
| DX (new project) | Moderate — user writes build.ts + dev.ts | Minimal — config only | Minimal — zero files |
| Extensibility | Full — user adds plugins/targets freely | Limited to config surface | Grows with CLI flags |
| HMR slot (Step 2.5) | New option in plugin + optional WS layer | Internal detail in dev() | --hmr flag |
| SSR slot (later) | Separate liteforgeBunSsrPlugin() | ssr: true config key | ssr subcommand |
| Testability | Perfect — plugin is isolated | Plugin isolated, helper needs mocks | Plugin isolated, CLI needs subprocess |
| Risk | Minimal | Couples to Bun API shapes | Config-discovery problem |

## Evaluation

**C collapses into B** in practice: a CLI always needs config-discovery (entry path, port). Once solved, it is Approach B under a different entrypoint — not an independent approach.

**B looks elegant** but `defineLiteforgeBunBuild` couples the package to specific `Bun.serve`/`Bun.build` API shapes. Bun 1.x is still evolving. If `BunPlugin` lifecycle hooks change, the helper breaks silently. Spec note is accurate: "zu früh abstrahiert."

**A is the honest approach**: a Bun plugin is a `BunPlugin`. That is the native unit of composition in Bun's ecosystem.

**Hybrid**: A + optional `createDevServer()` — additive, opt-in, can evolve without breaking the plugin.

## Decision: Approach A + `createDevServer()` as separate subpath export

**Approved naming and structure (per review):**

```
@liteforge/bun-plugin        → liteforgeBunPlugin()   (stable plugin, primary)
@liteforge/bun-plugin/dev    → createDevServer()       (convenience layer, can evolve)
```

**Rationale:**
1. `liteforgeBunPlugin()` mirrors `litforgeVitePlugin()` — immediate recognition
2. Exposes Bun API directly — user learns Bun, not an abstraction
3. `BunPlugin` is Bun's native composition unit
4. `createDevServer()` is additive — can be changed/removed without breaking plugin
5. HMR (Step 2.5) fits naturally as a new option inside `liteforgeBunPlugin`
6. Subpath export `@liteforge/bun-plugin/dev` signals: stable vs. convenience
