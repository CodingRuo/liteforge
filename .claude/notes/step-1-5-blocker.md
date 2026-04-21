# Step 1.5 — Phase C Blocker (aufgelöst 2026-04-21)

**Original-Datum:** 2026-04-20
**Aufgelöst:** 2026-04-21
**Status:** Blocker hat sich als konstruiert erwiesen — Phase C wird mit Declaration-Merging-Pattern (Weg 1-C) umgesetzt

## Was am 2026-04-20 als Blocker identifiziert wurde

Declaration Merging auf einem exportierten Interface (`ServerCtxRegistry` oder analog `PluginRegistry`) hat immer TS-Program-globalen Scope. Innerhalb eines TS-Programs mit zwei Apps, die unterschiedliche Ctx-Types auf denselben Key deklarieren, triggert dies `TS2717: Subsequent property declarations must have the same type`.

Verifiziert mit `/tmp/merge-conflict-probe.ts`.

## Warum das Problem konstruiert war

Im realistischen Monorepo-Setup ist jede App ein **eigener TypeScript-Scope**: eigene `tsconfig.json`, eigenes `include`/`exclude`, eigene Augmentationen in `src/types.d.ts`. Zwei Apps im selben `packages/`- oder `apps/`-Workspace teilen sich nie ein TS-Program.

Der Konflikt würde nur auftreten wenn ein gemeinsames TS-Programm beide App-Types gleichzeitig lädt — das passiert im Normalbetrieb nicht. Bei CI-weitem `pnpm typecheck:all` laufen die Projekte sequenziell, jedes mit seinem eigenen Scope.

**Framework-Analogien die das bestätigen:**
- TanStack Router nutzt genau dieses Pattern produktiv (`declare module '@tanstack/react-router' { interface Register { router: typeof router } }`) und funktioniert in Production-Monorepos.
- `@liteforge/i18n` nutzt dasselbe Pattern seit längerem ohne reale Kollision.
- Auch innerhalb `@liteforge/*`-Packages augmentieren toast, router, modal, etc. alle `PluginRegistry` ohne je kollidiert zu haben.

**Cross-Framework-Research** in `/tmp/cross-framework-research.md` zeigt dass tRPC, Hono und Effect **alle Alternativen** gewählt haben (pure typeof) — aber nicht weil Declaration Merging unbrauchbar wäre, sondern weil ihre Architekturen (keine Plugin-Registry, kein `use()`-System) es nicht brauchen. TanStack Router ist das direkteste Vergleichs-Framework und belegt dass Declaration Merging für App-spezifische Types in Production ein gangbarer Weg ist.

## Test-Setup-Implikation

Test-Dateien im selben TS-Programm (`packages/server/tests/`) teilen sich einen Scope. Wenn eine Test-Datei `ServerCtxRegistry` augmentiert, sieht jede andere Test-Datei dieselbe Augmentation. Das ist **kein Framework-Problem**, sondern eine reine Test-Tooling-Frage:

- Production-Typecheck: `tsconfig.json` excludiert `tests/**` → Augmentations in Tests haben keinen Einfluss
- Test-Isolation: Tests die Augmentation brauchen, leben in eigener Datei. Tests die *unaugmented* Default-Verhalten prüfen, leben in separater Datei oder in separatem Projekt

Standard-Setup, nichts Besonderes.

## Phase C Entscheidung

**Weg 1-C wie ursprünglich designed:**

1. `ServerCtxRegistry`-Interface in `@liteforge/server` (leer, offen)
2. `$ctx`-Phantom-Carrier auf `defineApp`-Return (analog `$server`)
3. `defineServerModule`-Handler-ctx = `ResolvedCtx` (= `ServerCtxRegistry.ctx` oder Fallback `BaseCtx`)
4. Runtime-Resolution: statisch + Resolver pro Request
5. User-Setup einmalig in `src/types.d.ts`:
   ```ts
   declare module '@liteforge/server' {
     interface ServerCtxRegistry {
       ctx: typeof app['$ctx']
     }
   }
   ```

Module-Files danach: Zero-Boilerplate, Zero-Annotation, Zero-Generic.

## Sources

- `/tmp/merge-conflict-probe.ts` — ursprüngliche Konflikt-Simulation (künstlich gleicher TS-Scope)
- `/tmp/cross-framework-research.md` — Cross-Framework-Analyse
- `.claude/specs/fullstack/phase-2/step-1-5-defineapp-fullstack-facade.md` — Spec
