/**
 * TableOfContents — sticky right-column nav with IntersectionObserver highlighting
 */
import { effect } from 'liteforge';

export interface TocEntry {
  id: string
  label: string | (() => string)
  level: 2 | 3
}

export interface TableOfContentsOptions {
  entries: TocEntry[]
  title?: string | (() => string)
}

// ── Styles (injected once) ────────────────────────────────────────────────────

let stylesInjected = false

function injectStyles(): void {
  if (stylesInjected) return
  stylesInjected = true

  const style = document.createElement('style')
  style.textContent = `
.docs-toc-nav {
  position: sticky;
  top: 28px;
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  padding: 0;
  scrollbar-width: none;
}
.docs-toc-nav::-webkit-scrollbar { display: none; }

.docs-toc-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--content-muted);
  margin-bottom: 10px;
  padding-left: 10px;
}

.docs-toc-link {
  display: block;
  font-size: 13px;
  color: var(--content-muted);
  text-decoration: none;
  padding: 3px 0 3px 10px;
  border-left: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-toc-link--h3 {
  padding-left: 20px;
  font-size: 12px;
}

.docs-toc-link:hover {
  color: var(--content-secondary);
  border-left-color: var(--line-default);
}

.docs-toc-link[aria-current="true"] {
  color: var(--color-primary);
  border-left-color: var(--color-primary);
}
`
  document.head.appendChild(style)
}

function resolveLabel(label: string | (() => string)): string {
  return typeof label === 'function' ? label() : label
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TableOfContents(options: TableOfContentsOptions): Node {
  injectStyles()

  const { entries, title = 'On this page' } = options

  const nav = document.createElement('nav')
  nav.className = 'docs-toc-nav'
  nav.setAttribute('aria-label', 'Table of contents')

  const titleEl = document.createElement('p')
  titleEl.className = 'docs-toc-title'
  titleEl.textContent = resolveLabel(title)
  if (typeof title === 'function') {
    effect(() => { titleEl.textContent = title() })
  }
  nav.appendChild(titleEl)

  // Build link elements, keyed by id
  const linkMap = new Map<string, HTMLAnchorElement>()

  for (const entry of entries) {
    const a = document.createElement('a')
    a.href = `#${entry.id}`
    a.className = entry.level === 3
      ? 'docs-toc-link docs-toc-link--h3'
      : 'docs-toc-link'
    a.textContent = resolveLabel(entry.label)
    if (typeof entry.label === 'function') {
      const labelFn = entry.label
      effect(() => { a.textContent = labelFn() })
    }
    nav.appendChild(a)
    linkMap.set(entry.id, a)
  }

  // ── IntersectionObserver — highlight active section ──────────────────────
  const ids = entries.map(e => e.id)
  let activeId: string | null = null

  const setActive = (id: string | null) => {
    if (id === activeId) return
    if (activeId) linkMap.get(activeId)?.removeAttribute('aria-current')
    activeId = id
    if (id) linkMap.get(id)?.setAttribute('aria-current', 'true')
  }

  // Wait for DOM to be ready before observing
  requestAnimationFrame(() => {
    const headings: Element[] = ids
      .map(id => document.getElementById(id))
      .filter(Boolean) as Element[]

    if (headings.length === 0) return

    // Track which headings are currently intersecting
    const visible = new Set<string>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id
          if (entry.isIntersecting) {
            visible.add(id)
          } else {
            visible.delete(id)
          }
        }

        // Pick the first visible heading in document order
        const first = ids.find(id => visible.has(id))
        if (first) {
          setActive(first)
        } else if (visible.size === 0 && activeId === null && ids[0]) {
          // Nothing visible yet — default to first
          setActive(ids[0])
        }
      },
      {
        rootMargin: '0px 0px -60% 0px',
        threshold: 0,
      }
    )

    for (const heading of headings) {
      observer.observe(heading)
    }

    // Cleanup when nav is removed from DOM
    const mo = new MutationObserver(() => {
      if (!nav.isConnected) {
        observer.disconnect()
        mo.disconnect()
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })
  })

  return nav
}
