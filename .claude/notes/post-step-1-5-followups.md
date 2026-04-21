# Post-Step-1.5 Follow-Up TODOs

Micro-PRs die nach dem Merge von Phase 2 Step 1.5 separat angegangen werden.

## create-liteforge typecheck errors (pre-existing on main)

`pnpm typecheck:all` bricht bei `create-liteforge/tests/create.test.ts` ab:

- `tests/create.test.ts(3,16): error TS6133: 'resolve' is declared but its value is never read.`
- `tests/create.test.ts(94,22): error TS2304: Cannot find name 'vi'.`

**Status:** Pre-existing, verifiziert per `git stash` → Main hat dieselben Fehler. Nicht durch Step-1.5-Arbeit verursacht.

**Fix:** Separater Micro-PR nach Step-1.5-Merge. Entweder ungenutzten Import entfernen und `vi` aus vitest importieren, oder `tests/` aus tsconfig excluden (wie bei anderen Packages).

**Nicht im aktuellen Scope** — Step 1.5 bleibt fokussiert auf defineApp-Facade.

## Polish: Doppel-.serverModules() Error-Message

Aktuell (Phase A): `Argument of type '...' is not assignable to parameter of type 'never'` (TS2345).

Lesbar aber nicht selbsterklärend. User muss selbst schließen dass `.serverModules()` bereits aufgerufen wurde.

**Polish:** Statt `never` eine descriptive Error-Shape:
```ts
TAlreadyCalled extends true
  ? { _error: '.serverModules() has already been called — it may be called at most once' }
  : ServerModulesGuard<...>
```

Würde analog zum Q1-ContextError-Pattern lesbar werden. Nicht kritisch — Edge-Case tritt selten auf.

**Wann:** Wenn User-Feedback dazu kommt, oder als Teil eines generellen Error-Polish-Passes.

## Codegen für .liteforge/types.d.ts (Schritt 1.6 oder Teil von Phase F)

**Kontext:** Phase C wählte Declaration Merging als Mechanismus für `ServerCtxRegistry.ctx` und `PluginRegistry.server`. User muss aktuell manuell in `src/types.d.ts` augmentieren.

**Ziel-Architektur (langfristig):** `@liteforge/bun-plugin` macht Codegen in `.liteforge/types.d.ts` — wie Vite/Next/Nuxt. User schreibt nichts in 95% der Fälle. Zusätzliche `declare module`-Blöcke für Custom-Plugins bleiben additive.

**Strategie:** Bun-Plugin liest `typeof app` aus dem User-Entry (z.B. `src/app.ts`), generiert eine `.liteforge/types.d.ts` die automatisch enthält:
```ts
declare module '@liteforge/server' {
  interface ServerCtxRegistry { ctx: typeof app['$ctx'] }
}
declare module '@liteforge/runtime' {
  interface PluginRegistry { server: typeof app['$server'] }
}
```
User's tsconfig.json inkludiert `.liteforge/types.d.ts` automatisch. Keine Boilerplate.

**Nicht in Phase D:** Heute akzeptieren wir den manuellen Augmentation-Schritt in Test-Files und Docs. Die kryptische `unknown`-Error-Message bei vergessener Augmentation wird durch Codegen eliminiert — Helper-Type-Warnung jetzt wäre Doppel-Arbeit.

**Scope:** Eigener Micro-PR nach Step-1.5-Merge, oder Teil von Phase F wenn Bun-Plugin-Integration dort ohnehin angefasst wird.

## Test-Strategy Refactor (post-Phase-D)

**Symptom:** `tests/types/augmented/{ctx,server}/` Sub-Sub-Ordner mit eigenen tsconfigs.
Entstanden weil mehrere `ServerCtxRegistry`-Augmentations im selben TS-Programm leaken und jede augmentation-abhängige Test-File ihren eigenen TS-Scope braucht.

**Optionen zu evaluieren:**
- `.test-d.ts` Files mit dediziertem Type-Test-Tool (tsd, vitest-typescript)
- Type-Tests komplett aus Vitest raushalten — separater tsc-Run pro File via CI-Script
- Andere Augmentation-Isolation-Patterns (z.B. separate TS-Projects via `references`)

**Skipped Test:**
`packages/server/tests/types/augmented/server/use-server.augmented.types.test.ts.skip` — PluginRegistry-Augmentation via `declare module '@liteforge/runtime'` für `server`-Key. Wieder aktivieren nach Refactor.

**Zusätzlich beim Refactor:** Pattern-Update im skipped Test von `typeof app['$server']` auf `ServerOf<typeof app>` umstellen (siehe Phase-D-Architektur-Fix in define-app.ts — ServerOf/CtxOf sind der kanonische Zugriff).
