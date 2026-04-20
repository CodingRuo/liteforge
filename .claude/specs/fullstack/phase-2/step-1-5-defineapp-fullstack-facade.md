# Phase 2 Step 1.5 — `defineApp` Fullstack Facade
**Package:** `@liteforge/server` (erweiterung, kein neues Package)  
**Branch:** `feat/defineapp-fullstack-facade`  
**Datum:** 2026-04-20  
**Status:** SPEC — bereit für Implementierung nach Lead-Review-Gate

> **Prompt-Anker:** Stoppe nicht bis du zufrieden bist. Jede Phase vollständig abschließen bevor die nächste startet. Kein "fast fertig" committen.

---

## Kontext & Voraussetzungen

Phase 2 Step 1 ist durch (PR #76, gemerged 2026-04-20). `@liteforge/server` hat:

- `defineServerFn` — Phantom-Type-Carrier mit Zod-validated Input
- `defineServerModule` — Fluent Builder, akkumuliert Fns via Intersection
- `liteforgeServer({ modules: {...} })` — OakBun-Plugin, registriert RPC-Routen
- `serverClientPlugin<Api>()` — typed Client-Proxy (subpath `@liteforge/server/client`)
- Security-Defaults: `X-Liteforge-RPC` header, CORS same-origin, Zod-Validation
- 16 Tests grün, Build sauber, Client < 1 kb gzip

**Was noch fehlt:** Der User muss heute `app.ts` (Backend) und `main.tsx` (Frontend) separat pflegen. Es gibt keine einheitliche Entry-API, keinen automatischen Client-Plugin-Install, keine HTML-/Build-Pipeline, kein `context`-System für Request-gebundene Daten.

Ziel dieses Schritts: `defineApp` als kanonischer Fullstack-Entry — ein File, ein Prozess, ein Command.

---

## Erfolgs-Kriterien (messbar, nicht vage)

- [ ] `bun run src/app.ts` startet Frontend + Backend + RPC in einem Prozess
- [ ] `src/app.ts` ist der einzige Setup-File — kein separates `main.tsx`, `build.ts`, `dev.ts` nötig
- [ ] `const server = use('server')` in einer Component funktioniert ohne expliziten Import
- [ ] `context: { tenantId: (req) => resolveTenant(req) }` ist in `defineServerFn`-Handlern als `ctx.tenantId: string` typed (keine expliziten Generics nötig)
- [ ] Browser-Smoke-Test: Button-Click → typed RPC-Call → Toast zeigt Response — Ende-zu-Ende im Browser
- [ ] `liteforgeServer()` und `serverClientPlugin()` weiterhin als öffentliche Exports, funktional unverändert
- [ ] `pnpm vitest run packages/server` — alle bestehenden 16 Tests + neue Tests grün
- [ ] `pnpm typecheck:all` — grün
- [ ] `pnpm build:packages` — grün
- [ ] Client-Bundle-Regression: < 1 kb gzip (serverClientPlugin darf nicht wachsen)

---

## Scope

**In Scope:**

- `defineApp({ root, target, document, context })` in `@liteforge/server`
- `defineDocument({ lang, head: { meta, links, scripts }, body: { class } })` minimal
- `context`-Option: statische Werte + Resolver-Funktionen `(req: Request) => T`, beides typed
- `.plugin(oakbunPlugin)` — OakBun-Plugins durchreichen
- `.use(liteforgeClientPlugin)` — LiteForge-Client-Plugins registrieren
- `.serverModules({ key: module })` — RPC-Module registrieren, `serverClientPlugin` automatisch installieren
- Terminal-Methoden: `.listen(port)`, `.mount()`, `.build({ outDir })`, `.dev({ port })`
- Build-Integration: automatisches HTML aus `defineDocument`, Bun.build für JS/CSS, Asset-Copy
- Refactoring `examples/starter-bun/`: ein `src/app.ts`, echte End-to-End-Browser-Demo mit Button → RPC → Toast

**Out of Scope (explizit — kein Scope-Creep):**

- SSR / Streaming-Rendering (Phase 4)
- `load().meta` dynamisches Meta-Merging (Phase 4)
- Multi-Document-Support
- `.useDev()` für Dev-Only-Plugins (eigener Schritt)
- HMR für Bun-Dev-Mode (eigener Schritt nach 1.5)
- `defineServerResource` (Schritt 2)
- `defineServerPlugin` (Schritt 3)
- File-based Routing
- Middleware-System für RPC-Handler
- Auth/Session-Abstraktion (gehört in OakBun-Plugins)

---

## Vier kritische Design-Fragen für den Approach-Vergleich

Alle vier müssen mit TypeScript-Compile-Check in `/tmp/approach-[A|B|C]-q[1-4].ts` verifiziert werden. Pseudocode zählt nicht.

### Frage 1: Wie fließt `context` in den OakBun-Ctx?

Das ist die wichtigste Type-Challenge dieser Phase. Gegeben:

```ts
const app = defineApp({
  context: {
    appVersion: '1.0.0',                        // statisch: string
    tenantId: (req: Request) => 'tenant-abc',   // Resolver: (req) => string
  },
})
```

Muss in einem Handler ankommen als:

```ts
.serverFn('hello', {
  handler: async (input, ctx) => {
    ctx.tenantId   // string  ✓ (Resolver wurde aufgelöst, nicht die Fn selbst)
    ctx.appVersion // string  ✓ (statischer Wert)
  },
})
```

**Option A:** `defineApp` generiert einen OakBun-Plugin der `.extend()` nutzt um `ctx` vor Handler-Aufruf zu erweitern. OakBun-Ctx wird mit aufgelösten Context-Werten augmentiert, dann an `liteforgeServer`-Handler weitergereicht.

**Option B:** `defineApp` patched den `ctx` direkt in einem Request-Wrapper — für jeden RPC-Request werden Resolver aufgerufen, Ergebnisse in ein neues Objekt gemischt, das als `ctx` übergeben wird. OakBun-Ctx wird nicht erweitert.

**Option C:** `context` wird vom `serverClientPlugin` getrennt behandelt — `defineApp` injiziert einen `LiteForgeContextProvider` der den aufgelösten Context als Proxy-Objekt bereitstellt, unabhängig von OakBun.

**Compile-Check-Kriterium:** Gegeben `context: { tenantId: (req: Request) => string }`, muss `ctx.tenantId` in der Handler-Signatur als `string` typisiert sein — ohne expliziten Generic an `defineServerFn`. Der Type-Flow `(req) => string` → `string` muss automatisch inferiert werden.

**Konkrete Type-Aufgabe für alle drei:** 

```ts
type ResolveContext<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends (req: Request) => infer R ? R : T[K]
}
// ResolveContext<{ tenantId: (req: Request) => string, version: '1.0' }>
// → { tenantId: string, version: '1.0' }
```

Dieser Utility-Type ist die Kern-Mechanik. Alle drei Approaches bauen darauf auf — der Unterschied liegt darin wo und wie der aufgelöste Context in den Handler-Aufruf fließt.

---

### Frage 2: Interne Architektur von `defineApp` — Timing der OakBun-Instanziierung

OakBun ist gesetzter hard dep für `defineApp` (siehe Risiko 2 / Layer-Trennung). Die verbleibende Frage ist **Timing**: Wann wird die OakBun-App-Instanz erzeugt?

**Option A: Eager — OakBun-Instanz direkt bei `defineApp()`**  
`defineApp()` ruft sofort `createApp()` (OakBun-intern) auf. `.plugin()`, `.use()` delegieren direkt an die OakBun-Instanz. Kein eigener Builder-State nötig.

Vorteil: Keine Doppel-Abstraktion — OakBun-State ist einmal, nicht zweimal.  
Risiko: OakBun-App-Instanz existiert auch wenn nur `.mount()` oder `.build()` genutzt wird — Side-Effects beim Import möglich.

**Option B: Lazy — OakBun-Instanz erst bei Terminal-Methode**  
`defineApp()` akkumuliert Config in eigenem internem Builder-State. OakBun-`createApp()` wird erst bei `.listen()` / `.dev()` aufgerufen. `.build()` und `.mount()` erzeugen keine OakBun-Instanz.

Vorteil: `.build()` / `.mount()` bleiben OakBun-frei (relevant für statische Deployments). Testbarkeit besser — kein Server-Start bei Import.  
Risiko: Doppelter State (Builder + OakBun-intern) muss sorgfältig gemapped werden.

**Compile-Check-Kriterium:** Beide müssen zeigen dass `.plugin()`, `.use()`, `.serverModules()` chainbar sind und TypeScript die Return-Type korrekt ableitet (kein `any`, keine Type-Assertion nötig).

---

### Frage 3: Automatische Installation von `serverClientPlugin`

Wenn `.serverModules({ greetings: greetingsModule })` aufgerufen wird, muss `serverClientPlugin` automatisch auf dem LiteForge-Client registriert werden — User soll `use('server')` nutzen können ohne expliziten `import { serverClientPlugin }`.

**Option A: Side-Effect bei `.serverModules()`**  
`.serverModules()` ruft sofort `liteforgeClientApp.use(serverClientPlugin<InferredApi>())` auf. Plugin ist ab diesem Moment registriert.

Risiko: `liteforgeClientApp` muss zu diesem Zeitpunkt bereits existieren. Race-Condition wenn `.serverModules()` vor `.use(routerPlugin)` aufgerufen wird.

**Option B: Deferred — installiert bei Terminal-Methode**  
`.serverModules()` merkt sich die Module. Bei `.listen()` / `.dev()` / `.mount()` installiert `defineApp` den Plugin bevor die App mountet. Reihenfolge ist determiniert.

Vorteil: Keine Race-Condition.  
Risiko: Zwischen `.serverModules()` und Terminal-Methode ist der Plugin noch nicht registriert — kein Problem wenn App noch nicht läuft, aber Unit-Tests könnten das testen.

**Option C: Lazy via `use('server')` selbst**  
Der erste Aufruf von `use('server')` in einer Component löst dynamisch `serverClientPlugin` aus — ähnlich wie `Symbol.for()`. `defineApp` registriert einen "deferred resolver" den `use()` kennt.

Vorteil: Zero-Cost wenn `use('server')` nie aufgerufen wird.  
Risiko: **Wahrscheinlich K.O. — silent-type-failure.** Wenn `.serverModules()` nicht aufgerufen wurde, hat `use('server')` keinen Type-Context und müsste `any` returnen. Das ist dasselbe Footgun-Muster das B1 bei der B3-Entscheidung disqualifiziert hat: falsche Verwendung erzeugt keinen Compile-Error, sondern stumm falschen Type.

**Prototyp-Pflicht für Option C:** Muss explizit zeigen dass `use('server')` ohne vorherigen `.serverModules()`-Call einen Compile-Error gibt — nicht `any`. Wenn das nicht möglich ist ohne `any`-Leak, ist Option C disqualifiziert.

---

### Frage 4: Implementierung von `.build()` und `.dev()`

**Option A: Intern `@liteforge/bun-plugin`-Funktionen aufrufen**  
`defineApp` importiert `createDevServer` und `liteforgeBunPlugin` intern. `.dev()` ruft `createDevServer({ entry, outDir, port })` auf. `.build()` ruft `Bun.build()` mit `liteforgeBunPlugin()`.

Vorteil: Code-Reuse, bewährte API.  
Risiko: `defineApp` bekommt eine Abhängigkeit auf `@liteforge/bun-plugin` — zirkulär wenn bun-plugin je server importiert.

**Option B: Eigene Pipeline auf Bun-Primitiven**  
`defineApp` baut `.dev()` und `.build()` direkt auf `Bun.build()` + `Bun.serve()`. Kein Import von `@liteforge/bun-plugin`. HTML wird aus `defineDocument` gerendert, CSS wird gecopyied, JS wird gebundelt.

Vorteil: Keine Abhängigkeit auf bun-plugin.  
Risiko: Code-Duplikation gegenüber bun-plugin.

**Option C: CLI-Delegation**  
`.dev()` und `.build()` spawnen intern `bun run @liteforge/bun-plugin dev` / `build` als subprocess. App-File ist der Entry-Point.

Vorteil: Saubere Trennung.  
Risiko: Subprocess-Kommunikation, keine Type-Safety, langsam.

---

## Risiken & Stolperfallen

1. **Context-Type-Propagation ist die härteste TS-Challenge.** `(req: Request) => string` muss zu `string` werden ohne explizite Annotation. `ResolveContext<T>` muss korrekt distribuieren — Conditional Types über Mapped Types sind fehleranfällig bei `exactOptionalPropertyTypes: true`. Prototyp zuerst, Implementierung danach.

2. **Layer-Trennung bei OakBun-Dependency — kein "alles oder nichts".** Die Abhängigkeit ist schicht-spezifisch gesetzt:
   - **Low-Level** (`liteforgeServer`, `serverClientPlugin`, `plugin.ts`): bleibt OakBun-frei, wie in Step 1. Kein OakBun-Import.
   - **High-Level** (`defineApp`, `defineDocument`, `define-app.ts`): OakBun ist expliziter hard dep. `packages/server/package.json` bekommt `"oakbun": "workspace:*"` in `dependencies`. Das ist bewusste Entscheidung, nicht Slip.
   Konsequenz: `plugin.ts` darf nie `oakbun` importieren. `define-app.ts` darf es. Diese Grenze muss in Phase A's DoD verifiziert und in der Architektur-Regel dokumentiert werden.

3. **`use('server')` erfordert LiteForge-Runtime-Integration.** `use()` in `defineComponent` kommt aus `@liteforge/runtime`. `defineApp` in `@liteforge/server` darf `@liteforge/runtime` nicht importieren (Dependency-Graph-Verletzung: server hat keine liteforge-deps). Die Brücke muss über das Plugin-System laufen — `use('server')` muss vom Plugin registriert worden sein bevor die Component mountet. Dieser Mechanismus muss früh prototypiert werden.

4. **`defineDocument` HTML-Output muss mit Bun.build Output-Hashes kompatibel sein.** Wenn Bun.build `main-[hash].js` erzeugt, muss das generierte HTML auf `main-[hash].js` zeigen — kein hardcoded `main.js`. Entweder: kein Hashing in `.dev()`, oder: `Bun.build()` Returns werden ausgewertet und HTML nachträglich gepatcht.

5. **Starter-Bun-Refactoring ist ein Regressions-Risiko.** Das bestehende `dev.ts` / `build.ts` / `main.tsx` Setup funktioniert. Der Refactor auf `app.ts` darf nicht die Frontend-Funktionalität brechen (Router, Form, Toast). Browser-Test vor und nach dem Refactor pflicht.

6. **`import.meta.main`-Guard ist Bun-spezifisch.** `if (import.meta.main) await app.listen(3000)` funktioniert nur in Bun. Node-Compat oder Test-Environments haben `import.meta.main === undefined`. Tests die `defineApp` importieren müssen den Guard umgehen können — Terminal-Methoden dürfen nicht auto-invoke sein.

---

## Eval-Loop-Ablauf

### Schritt 0: Vorbereitende Recherche (kein Code)

Bevor irgendein Code geschrieben wird:

1. OakBun-API lesen: `packages/server/src/plugin.ts` und existierende OakBun-Plugin-Beispiele. Konkret: Wie sieht OakBun's `.extend()` API aus? Gibt es eine offizielle `ctx`-Extension-API?
2. LiteForge Runtime `use()`-Mechanismus lesen: Wie registriert ein Plugin sich für `use(key)`? Welche Interface muss ein Plugin implementieren? (`packages/runtime/src/plugin-registry.ts`)
3. `@liteforge/bun-plugin/dev` lesen: Was macht `createDevServer()`? Was sind die Grenzen? (`packages/bun-plugin/src/`)
4. Nach Lesen: `DECISION.md` Vorab-Sektion schreiben — was ist bekannt, was ist unklar, welche Frage ist am riskantesten.

### Schritt 1: Vier Approaches prototypieren

Für jede der vier Design-Fragen: Approach A, B, C in separaten Temp-Files mit echtem TypeScript-Compile-Check.

```
/tmp/proto-q1-a.ts   — Context-Flow: OakBun .extend()
/tmp/proto-q1-b.ts   — Context-Flow: direktes Patching
/tmp/proto-q1-c.ts   — Context-Flow: LiteForge-Context-Provider
/tmp/proto-q2-a.ts   — OakBun-Timing: Eager (direkt bei defineApp())
/tmp/proto-q2-b.ts   — OakBun-Timing: Lazy (bei Terminal-Methode)
/tmp/proto-q3-a.ts   — serverClientPlugin-Install: sofort bei .serverModules()
/tmp/proto-q3-b.ts   — serverClientPlugin-Install: deferred bei Terminal
/tmp/proto-q3-c.ts   — serverClientPlugin-Install: lazy via use() [K.O.-Check: any-Leak?]
/tmp/proto-q4-a.ts   — Build/Dev: via @liteforge/bun-plugin
/tmp/proto-q4-b.ts   — Build/Dev: eigene Bun-Pipeline
/tmp/proto-q4-c.ts   — Build/Dev: CLI-Delegation
```

**Compile-Check obligatorisch für jeden Prototyp:**
```sh
bunx tsc --strict --noEmit --target esnext --moduleResolution bundler /tmp/proto-qX-Y.ts
```

Fehlschlag = disqualifiziert (oder begründete Ausnahme in DECISION.md).

### Schritt 2: Drei Iterationen Evaluierung

**Iteration 1 — Erstbewertung:** Für jede Frage: welcher Approach kompiliert, welcher nicht? Was sind die Vor-/Nachteile?

**Iteration 2 — Cross-Fragen-Analyse:** Die vier Fragen sind nicht unabhängig. Welche Approach-Kombinationen sind intern konsistent? Z.B.: Frage-2-Option-A (Facade über OakBun-createApp) erzwingt bestimmte Antworten bei Frage 1 und 3.

**Iteration 3 — Risiko-Gewichtung:** Welche Entscheidung hat die größten Langzeit-Konsequenzen? (Hint: Frage 1 — Context-Type-Propagation — ist die härteste und bestimmt viele andere Entscheidungen.)

### Schritt 3: Lead-Review-Gate

Ergebnis von Schritt 2 dokumentieren in `/tmp/DECISION.md`:

```markdown
# defineApp Approach-Entscheidung

## Bereits getroffene Entscheidungen (Lead-approved, nicht zur Debatte)

1. **Package-Name bleibt `@liteforge/server`** — kein neues Fullstack-Package. Low-Level und High-Level im selben Package.
2. **OakBun als hard dep für `defineApp`** — aber Layer-spezifisch: `plugin.ts` bleibt OakBun-frei, `define-app.ts` darf OakBun importieren.
3. **Ein `defineApp`, mehrere Terminal-Methoden** — `.mount()`, `.listen()`, `.build()`, `.dev()` alle auf demselben Builder.
4. **`defineDocument` minimal** — statische Config, kein dynamisches Meta-Merging, kein Multi-Document.

## Approach-Entscheidungen (aus Eval-Loop)

### Frage 1 (Context-Flow): Gewählt: [A|B] — Begründung: ...
### Frage 2 (OakBun-Timing): Gewählt: [A|B] — Begründung: ...
### Frage 3 (serverClientPlugin-Install): Gewählt: [A|B|C] — Begründung: ...
### Frage 4 (Build/Dev): Gewählt: [A|B] — Begründung: ...

## Verworfene Approaches:
- [Frage X, Option Y]: [Grund — compile-fail / architectural conflict / silent-type-failure / other]

## Offene Fragen die Implementierung beantworten wird:
- ...
```

**STOP. Implementierung erst nach expliziter Lead-Freigabe.**

---

## Commit-Strategie

Jede Phase ist ein eigener Commit. Kein "WIP" committen. Kein squashen am Ende.

| Phase | Commit-Titel | Inhalt |
|-------|-------------|--------|
| A | `feat(server): scaffold defineApp + defineDocument types` | Leere Shells, Typ-Signaturen, keine Logik |
| B | `feat(server): implement defineApp builder chain` | `.plugin()`, `.use()`, `.serverModules()` mit internem State |
| C | `feat(server): add context with resolver support + type inference` | `ResolveContext<T>`, Resolver-Auflösung pro Request, Handler-Ctx typed |
| D | `feat(server): wire serverModules → auto-install serverClientPlugin` | `use('server')` funktioniert in Components |
| E | `feat(server): implement defineDocument + HTML rendering` | `defineDocument`, HTML-String-Generation aus Config |
| F | `feat(server): terminal methods — listen, mount, build, dev` | `.listen()`, `.dev()`, `.build()`, `.mount()` implementiert |
| G | `feat(examples): refactor starter-bun to single app.ts entry` | Neues `src/app.ts`, Browser-Demo mit Button → RPC → Toast |
| H | `test(server): add defineApp + defineDocument + context tests` | Alle neuen Tests, bestehende 16 grün |
| I | `docs(server): update CLAUDE.md — defineApp canonical status` | CLAUDE.md aktualisieren, defineApp als kanonischen Entry markieren |

---

## Phase-by-Phase Detailplan

### Phase A — Scaffold (Typen, keine Logik)

Ziel: Type-Signaturen aller neuen Exports definieren, kein Implementierungs-Code.

Neue Files:
- `packages/server/src/define-app.ts` — `defineApp()` Typ-Signatur, `AppBuilder` Interface
- `packages/server/src/define-document.ts` — `defineDocument()`, `DocumentConfig` Type
- `packages/server/src/context.ts` — `ResolveContext<T>` Utility-Type, `ContextMap` Type

Änderungen:
- `packages/server/src/index.ts` — neue Exports ergänzen
- `packages/server/src/types.ts` — `AppContext` Type ergänzen

**DoD Phase A:**
- [ ] `defineApp` ist exportiert mit vollständiger Typ-Signatur (kein `any` in public API)
- [ ] `defineDocument` ist exportiert
- [ ] `ResolveContext<{ tenantId: (req: Request) => string }>` → `{ tenantId: string }` (compile-check)
- [ ] `packages/server/package.json` enthält `"oakbun": "workspace:*"` in `dependencies`
- [ ] Layer-Trennung verifiziert: `grep -r "from 'oakbun'" packages/server/src/plugin.ts` → kein Match. `grep -r "from 'oakbun'" packages/server/src/define-app.ts` → Match vorhanden (oder explizit geplant)
- [ ] `pnpm typecheck:all` grün

### Phase B — Builder-Chain

Ziel: `.plugin()`, `.use()`, `.serverModules()` implementieren mit internem State-Akkumulator.

```ts
// Interner State (nicht public):
interface AppBuilderState {
  options: AppOptions<any>
  oakbunPlugins: unknown[]
  liteforgePlugins: LiteForgePlugin[]
  modulesMap: ModulesMap | null
}
```

**DoD Phase B:**
- [ ] Alle drei Methoden sind chainbar: `defineApp(...).plugin(...).use(...).serverModules(...)` kompiliert
- [ ] Return-Type ist korrekt (kein `any`)
- [ ] Interner State akkumuliert korrekt (Unit-Test)

### Phase C — Context mit Resolver-Support

Ziel: `context`-Option evaluiert Resolver-Fns pro Request, injiziert aufgelöste Werte in Handler-Ctx. Type-Inference automatisch.

**Kritischer Type-Test der grün sein muss (Positiv + Negativ):**

```ts
import { defineApp, defineServerModule } from '@liteforge/server'
import { z } from 'zod'

const app = defineApp({
  root: {} as any,
  target: '#app',
  context: {
    version: '1.0',
    tenantId: (req: Request) => 'tenant-' + req.headers.get('x-tenant'),
  },
})

const mod = defineServerModule('test')
  .serverFn('check', {
    input: z.object({ q: z.string() }),
    handler: async (input, ctx) => {
      // ── Positiv-Tests: kein expliziter Type nötig ──────────────────────────
      const v = ctx.version   // inferred als string (nicht '1.0' Literal)
      const t = ctx.tenantId  // inferred als string (nicht (req: Request) => string)

      // ── Negativ-Tests: falsche Verwendungen müssen Compile-Errors geben ───
      // @ts-expect-error — tenantId ist aufgelöster string, keine Fn mehr
      ctx.tenantId()

      // @ts-expect-error — version ist string, keine Zahl
      const n: number = ctx.version

      return { v, t }
    },
  })
  .build()
```

Dieser Test muss ohne explizite Generic-Annotation kompilieren. Die `@ts-expect-error`-Zeilen müssen exakt einen Error unterdrücken — wenn sie keinen Error unterdrücken (also kein Error auftritt wo einer erwartet wurde), schlägt `tsc --strict` fehl.

**DoD Phase C:**
- [ ] `ResolveContext<T>` korrekt implementiert für statische Werte + Resolver
- [ ] Handler-Ctx enthält aufgelöste Werte (Runtime + Compile-Time)
- [ ] Resolver wird pro Request aufgerufen (nicht einmal beim Start)
- [ ] Positiv-Test: `ctx.tenantId` ist `string`, kein explicit Type nötig
- [ ] Negativ-Test: `ctx.tenantId()` gibt Compile-Error (kein `any`-Leak)
- [ ] Negativ-Test: `const n: number = ctx.version` gibt Compile-Error

### Phase D — serverModules → auto-install

Ziel: `.serverModules()` registriert Module und installiert `serverClientPlugin` automatisch.

Die Bridge zwischen `@liteforge/server` und `@liteforge/runtime`'s `use()`-System muss hier implementiert werden. Konkret: wie registriert ein Server-Plugin sich als `use('server')`-Provider?

→ Dieses Interface muss aus `@liteforge/runtime` ohne Import abstrahiert werden (Plugin-Protocol).

**DoD Phase D:**
- [ ] `use('server')` in einer Component gibt den typed Proxy zurück
- [ ] Type ist `InferServerApi<typeof app>` — nicht `any`
- [ ] Kein expliziter `serverClientPlugin`-Import im Component-File nötig

### Phase E — defineDocument

Ziel: `defineDocument` erzeugt valides HTML-Document.

```ts
const document = defineDocument({
  lang: 'de',
  head: {
    meta: { title: 'App', description: 'Beschreibung' },
    links: [{ rel: 'stylesheet', href: '/styles.css' }],
    scripts: [],
  },
})
```

Intern: `renderDocument(config, { jsEntry, cssEntry })` → HTML-String. Kein DOM-Dependency (Node-kompatibel).

**DoD Phase E:**
- [ ] `renderDocument()` Unit-Test: gegebener Config → erwarteter HTML-String
- [ ] `<title>`, `<meta name="description">`, `<link rel="stylesheet">` korrekt
- [ ] `<script type="module" src="...">` korrekt
- [ ] `<div id="app">` (oder konfigurierbarer `target`) korrekt

### Phase F — Terminal-Methoden

Vier Methoden, klar getrennte Concerns:

**`.listen(port)`** — startet OakBun-Server mit allen registrierten Plugins + RPC-Routen. Rendert HTML via `defineDocument`. Served static assets.

**`.mount()`** — SPA-only, kein Server. Mountet LiteForge-App in DOM. Für Environments ohne Server.

**`.build({ outDir })`** — produziert `dist/`: `Bun.build()` für JS, Asset-Copy für CSS/Static, `index.html` aus `defineDocument`.

**`.dev({ port })`** — Entwicklungs-Modus: Rebuild on request (wie bisheriges `createDevServer`-Verhalten) + RPC-Routes in einem Prozess.

**DoD Phase F:**
- [ ] `.listen(3000)` startet Server (Integration-Test: `fetch('http://localhost:3000')` → 200)
- [ ] `.build({ outDir: './dist' })` erzeugt `dist/index.html`, `dist/*.js`, Stylesheets
- [ ] `.dev({ port: 3000 })` startet Dev-Server mit RPC-Routes
- [ ] `.mount()` mountet App ohne Server (happy-dom Unit-Test)
- [ ] `import.meta.main`-Guard funktioniert korrekt

### Phase G — starter-bun Refactoring

Ziel: `examples/starter-bun/` auf ein `src/app.ts` reduzieren.

**Neues File-Layout:**
```
examples/starter-bun/
  src/
    app.ts                    ← EINZIGER SETUP-ENTRY
    App.tsx
    components/
      GreetingDemo.tsx        ← neu: Button → RPC → Toast
    pages/
      Home.tsx
      About.tsx
    server/
      greetings.server.ts     ← unverändert
    styles.css
  index.html                  ← optional: fallback wenn defineDocument nicht genutzt
  package.json
```

**`src/app.ts` final:**

```ts
import { defineApp, defineDocument } from '@liteforge/server'
import { routerPlugin, defineRouter } from '@liteforge/router'
import { toastPlugin } from '@liteforge/toast'
import { greetingsModule } from './server/greetings.server.js'
import { App } from './App.js'

const router = defineRouter({
  routes: [
    { path: '/', component: () => import('./pages/Home.js') },
    { path: '/about', component: () => import('./pages/About.js') },
  ],
})

const document = defineDocument({
  lang: 'en',
  head: {
    meta: { title: 'LiteForge Starter (Bun)', description: 'Fullstack demo' },
    links: [{ rel: 'stylesheet', href: '/styles.css' }],
  },
})

export const app = defineApp({
  root: App,
  target: '#app',
  document,
})
  .serverModules({ greetings: greetingsModule })
  .use(routerPlugin(router))
  .use(toastPlugin())

if (import.meta.main) {
  await app.dev({ port: 3000 })
}
```

**`GreetingDemo.tsx` (Browser-Smoke-Test-Component):**

```tsx
import { defineComponent } from '@liteforge/runtime'

export const GreetingDemo = defineComponent({
  component({ use }) {
    const server = use('server')
    const toast = use('toast')

    async function handleGreet() {
      const result = await server.greetings.hello({ name: 'René' })
      toast.info(result.greeting)
    }

    return (
      <div>
        <button onclick={handleGreet}>Say Hello (RPC)</button>
      </div>
    )
  },
})
```

**DoD Phase G:**
- [ ] `bun run src/app.ts` startet App auf Port 3000 ohne Fehler
- [ ] Browser öffnet `localhost:3000` → Frontend lädt
- [ ] Button-Click → RPC → Toast zeigt "Hello, René! 👋"
- [ ] `/about` Route funktioniert
- [ ] Form auf `/` funktioniert
- [ ] Kein `main.tsx`, `dev.ts`, `build.ts` mehr nötig (oder nur minimale Wrapper)

### Phase H — Tests

Neue Test-Suite: `packages/server/tests/define-app.test.ts`

Mindest-Tests:
1. `defineApp` — gibt AppBuilder zurück mit chainbaren Methoden
2. `defineApp.plugin()` — OakBun-Plugin wird akkumuliert
3. `defineApp.use()` — LiteForge-Plugin wird akkumuliert
4. `defineApp.serverModules()` — Module werden registriert
5. `defineDocument` — rendert korrekten HTML-String (title, meta, link, script, div#app)
6. `ResolveContext<T>` — statische Werte bleiben, Resolver-Fns werden aufgelöst (Type-Test)
7. `context` Resolver — wird pro Request aufgerufen, nicht cached
8. `context` statischer Wert — im Handler-Ctx verfügbar
9. `.mount()` — mountet App in DOM (happy-dom)
10. Bestehende 16 Tests — unverändert grün

**DoD Phase H:**
- [ ] Alle neuen Tests grün
- [ ] Alle 16 bestehenden Tests grün
- [ ] `pnpm test` grün

### Phase I — Docs

**CLAUDE.md updaten:**
- `@liteforge/server` Sektion: Low-Level-API-Vermerk entfernen / anpassen — `defineApp` ist jetzt kanonisch
- Package-Tabelle: Beschreibung updaten, Test-Count updaten
- Server-Package-Sektion: `defineApp`-Beispiel als kanonischen Entry zeigen, Low-Level bleibt als "expert usage"

**starter-bun README updaten:**
- Beschreibt neues single-entry Setup
- Browser-Demo-Anleitung: `bun run src/app.ts`, dann Browser öffnen, Button clicken

---

## Refactoring-Validation-Regel (aus CLAUDE.md)

Beim Starter-Bun-Refactor gilt: bestehende Frontend-Funktionalität (Router, Form, Toast) ist Source of Truth. Wenn ein Test rot ist:

1. **Test war vorher grün** → Refactoring hat Code gebrochen, nicht Test anpassen
2. **Test hatte anderen Assert** → Original-Verhalten feststellen, Assert angleichen
3. **Test ist neu** → Original-Code-Verhalten zuerst feststellen, dann Test schreiben

Nie einen Test gegen aktuellen Output reschreiben ohne Original-Verhalten verifiziert zu haben.

---

## Bug-Hunting-Disziplin

Wenn etwas nicht funktioniert:

1. Hypothese explizit formulieren bevor Diagnose läuft
2. Kleinste Diagnose die die Hypothese falsifizieren kann (kein breites Logging)
3. Wenn falsifiziert: neue Hypothese aus den neuen Daten — nicht raten
4. Wenn bestätigt: fixen, dann verifizieren dass genau dieser Failure-Path geschlossen ist

Besonders relevant bei Context-Type-Propagation: wenn `ctx.tenantId` den falschen Type hat, erst verstehen warum (`ResolveContext<T>` falsch? Mapping-Type falsch? Intersection-Problem?) bevor gepatcht wird.

---

## Definition of Done (Gesamt)

- [ ] Alle Erfolgs-Kriterien aus Abschnitt "Erfolgs-Kriterien" erfüllt
- [ ] Alle Phasen A–I committed
- [ ] `pnpm vitest run packages/server` — alle Tests grün (≥ 26 Tests: 16 existing + ≥ 10 new)
- [ ] `pnpm typecheck:all` — grün
- [ ] `pnpm build:packages` — grün
- [ ] Browser-Smoke-Test: Button → RPC → Toast dokumentiert (Screenshot oder curl-Output)
- [ ] CLAUDE.md aktualisiert — `defineApp` als kanonischen Entry für Fullstack
- [ ] PR-Description: Approach-Entscheidungen transparent, Security-Modell erklärt, "Not in this PR" Liste
- [ ] Low-Level-API (`liteforgeServer`, `serverClientPlugin`) unverändert funktional

> **Prompt-Anker:** Stoppe nicht bis du zufrieden bist. Kein "fast fertig" committen. Jede Phase vollständig, dann erst die nächste.
