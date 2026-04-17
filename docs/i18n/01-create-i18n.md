---
title: "createI18n"
category: "i18n"
tags: ["i18n", "createI18n", "locale", "translations", "interpolation", "plural", "defineLocale"]
related: ["defineApp", "Context"]
---

# createI18n

> Internationalization with typed translation keys, locale switching, interpolation, and pluralization.

## Installation

```bash
npm install @liteforge/i18n
```

## Quick Start

```ts
// locales/en.ts
import { defineLocale } from '@liteforge/i18n'

export default defineLocale({
  greeting: 'Hello, {name}!',
  nav: { home: 'Home', about: 'About' },
  items: { one: '{count} item', other: '{count} items' },
})

// main.ts
import { createI18n } from '@liteforge/i18n'
import en from './locales/en'

const i18n = createI18n({
  default: en,
  load: (locale) => import(`./locales/${locale}.js`).then(m => m.default),
})

// Use in components
i18n.t('greeting', { name: 'Alice' })  // → 'Hello, Alice!'
i18n.t('nav.home')                      // → 'Home'
i18n.locale()                           // → 'en' (Signal)
await i18n.setLocale('de')
```

## API Reference

### `createI18n<T>(options)` — new API (preferred)

**Options (`I18nOptions<T>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `default` | `T` | required | Default locale translations (type is inferred from this) |
| `load` | `(locale: Locale) => Promise<T>` | — | Async locale loader |
| `defaultLocaleKey` | `string` | `'en'` | Key for the default locale |
| `fallback` | `Locale` | — | Fallback locale when key missing |
| `persist` | `boolean` | `true` | Persist locale to `localStorage` |
| `storageKey` | `string` | `'lf-locale'` | localStorage key |

### `createI18n<T>(options)` — legacy API

**Options (`StandaloneI18nOptions`):**

| Option | Type | Description |
|--------|------|-------------|
| `defaultLocale` | `Locale` | Initial locale |
| `load` | `(locale: Locale) => Promise<TranslationTree>` | Locale loader |
| `fallbackLocale` | `Locale` | Fallback locale |
| `persist` | `boolean` | Persist to localStorage |
| `storageKey` | `string` | localStorage key |

**Returns (`I18nApi<T>` / `I18nInstance<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `t(key, params?)` | `(key: ExtractKeys<T>, params?: InterpolationParams) => string` | Translate a key |
| `locale` | `Signal<Locale>` | Current locale |
| `setLocale(locale)` | `(locale: Locale) => Promise<void>` | Switch locale (async load) |
| `has(key)` | `(key: string) => boolean` | Check if key exists |

### `defineLocale<T>(translations)` → `T`

Identity wrapper for locale objects. Signals intent and enables future validation hooks.

### `i18nPlugin(options?)` → `LiteForgePlugin`

Register i18n in the app context so `use('i18n')` returns the typed `I18nApi`.

```ts
import { i18nPlugin } from '@liteforge/i18n'
import en from './locales/en'

await defineApp({ root: App, target: '#app' })
  .use(i18nPlugin({ default: en, load }))
```

### Utility functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `resolveKey` | `(tree, key) => string \| undefined` | Resolve a dot-notation key from a translation tree |
| `interpolate` | `(template, params) => string` | Replace `{name}` placeholders |
| `resolvePlural` | `(tree, key, count, locale) => string` | Resolve plural form using `Intl.PluralRules` |

## Examples

### Typed keys

```ts
// TypeScript will check that 'greeting' and 'nav.home' exist in the en locale
const i18n = createI18n({ default: en, load })

i18n.t('greeting', { name: 'Bob' })  // OK — typed
i18n.t('typo.key')                   // TS error — key doesn't exist
```

### Pluralization

```ts
// locale:
// items: { one: '{count} item', other: '{count} items' }

i18n.t('items', { count: 1 })   // → '1 item'
i18n.t('items', { count: 5 })   // → '5 items'
```

### Locale switching

```ts
const LangSwitcher = defineComponent({
  setup({ use }) {
    const i18n = use<I18nApi>('i18n')
    return { i18n }
  },
  component({ setup }) {
    return (
      <select onchange={(e) => setup.i18n.setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    )
  },
})
```

## Notes

- The new `createI18n({ default: en, load })` API infers the translation type from `default`. No explicit generic needed.
- Legacy API `createI18n<T>({ defaultLocale, load })` is deprecated but supported.
- Translations are loaded asynchronously. The `locale` signal and `t()` reactively update after `setLocale()` resolves.
- `persist: true` saves the selected locale to `localStorage` and restores it on next load.
- `t()` uses `Intl.PluralRules` for pluralization — no external date/locale library.
