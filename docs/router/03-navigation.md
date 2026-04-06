---
title: "Navigation"
category: "router"
tags: ["navigate", "Link", "NavLink", "RouterOutlet", "useParam", "back", "forward"]
related: ["createRouter", "Route Definition"]
---

# Navigation

> Programmatic navigation, `<Link>`, `<NavLink>`, `<RouterOutlet>`, and route helpers.

## Installation

```bash
npm install @liteforge/router
```

## Quick Start

```tsx
import { Link, NavLink, RouterOutlet } from '@liteforge/router'

// In your layout
const Layout = createComponent({
  setup({ use }) {
    const router = use('router')
    return { router }
  },
  component({ setup }) {
    return (
      <div>
        <nav>
          <NavLink href="/">Home</NavLink>
          <NavLink href="/about">About</NavLink>
        </nav>
        <main>
          <RouterOutlet />
        </main>
      </div>
    )
  },
})
```

## API Reference

### `router.navigate(target, options?)` → `Promise<boolean>`

Navigate to a path.

| Param | Type | Description |
|-------|------|-------------|
| `target` | `string \| Location` | Path or location object |
| `options.replace` | `boolean` | Replace current history entry |
| `options.state` | `unknown` | State to pass to history |

### `router.navigate(pattern, params, options?)` → `Promise<boolean>`

Navigate with param filling.

```ts
router.navigate('/users/:id', { id: '42' })
// → navigates to /users/42
```

### `router.replace(target, options?)` → `Promise<boolean>`

Like `navigate()` but replaces the current history entry (no back stack entry).

### `router.back()`, `router.forward()`, `router.go(delta)`

Programmatic history navigation.

### `<RouterOutlet />`

Renders the matched route's component. Place in your layout.

```tsx
<RouterOutlet />
```

### `<Link href="...">...</Link>`

Renders an `<a>` tag that uses `router.navigate()` instead of full page reload.

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Target path |
| `replace` | `boolean` | Use `router.replace()` |
| `state` | `unknown` | History state |

### `<NavLink href="...">...</NavLink>`

Like `<Link>` but adds an `active` class (or custom `activeClass`) when the path matches.

| Prop | Type | Description |
|------|------|-------------|
| `href` | `string` | Target path |
| `activeClass` | `string` | Class when active (default: `'active'`) |
| `exact` | `boolean` | Require exact path match |

### `useParam(key)` → `Signal<string>`

Returns a reactive signal for a specific route parameter.

```ts
import { useParam } from '@liteforge/router'

setup() {
  const userId = useParam('id')  // Signal<string>
  return { userId }
}
```

### `useTitle(title)` → `void`

Override the document title for the current route.

```ts
import { useTitle } from '@liteforge/router'

setup({ props }) {
  useTitle(() => `User ${props.id}`)
}
```

## Examples

### Programmatic navigation

```ts
setup({ use }) {
  const router = use('router')
  return { router }
},
component({ setup }) {
  async function handleSubmit() {
    await saveData()
    await setup.router.navigate('/success')
  }
  return <button onclick={handleSubmit}>Save</button>
}
```

### Active nav links

```tsx
<nav>
  <NavLink href="/" exact activeClass="nav--active">Home</NavLink>
  <NavLink href="/blog" activeClass="nav--active">Blog</NavLink>
</nav>
```

## Notes

- `<Link>` and `<NavLink>` intercept clicks and use `router.navigate()` — no page reload.
- `beforeEach` hooks run on every navigation including `<Link>` clicks.
- Guards returning `{ redirect: '/path' }` will redirect; returning `false` or `{ allowed: false }` blocks.
- `router.isNavigating()` is `true` during async guard/middleware execution — use it for loading indicators.
