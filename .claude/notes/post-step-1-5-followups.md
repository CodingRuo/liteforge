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
