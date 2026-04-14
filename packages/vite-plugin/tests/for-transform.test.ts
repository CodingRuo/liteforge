/**
 * For() Transform Tests
 *
 * Verifies that the vite-plugin transforms developer-facing For() calls
 * into the runtime's getter-based API.
 */

import { describe, it, expect } from 'vitest';
import { transformCode } from '../src/transform.js';

// Helper: normalize whitespace for comparison
function norm(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

describe('For() transform', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // each prop
  // ─────────────────────────────────────────────────────────────────────────

  describe('each prop', () => {
    it('wraps a signal call in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // each should become () => items()
      expect(norm(output)).toContain('each: () => items()');
    });

    it('wraps a logical expression in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: data() ?? [], children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('each: () => data() ??');
    });

    it('wraps an empty array literal in a getter (ArrayExpression is dynamic)', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: [], children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // ArrayExpression is dynamic by shouldWrapExpression — gets wrapped
      expect(norm(output)).toContain('each: () => []');
    });

    it('leaves an already-getter each unwrapped', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: () => items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // Should not double-wrap
      expect(norm(output)).not.toContain('each: () => () =>');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — property access
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — property access', () => {
    it('transforms item.name to () => item().name', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.name}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().name');
    });

    it('transforms multiple property accesses', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: users(),
                children: (user) => (
                  <li>
                    <span>{user.name}</span>
                    <span>{user.email}</span>
                  </li>
                ),
              })}
            </ul>
          );
        }
      `;
      // Normalize away Babel generator whitespace quirks (e.g. "user(). name" → "user().name")
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('() => user().name');
      expect(output).toContain('() => user().email');
    });

    it('transforms nested property access (item.address.city)', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({ each: items(), children: (item) => <li>{item.address.city}</li> })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().address.city');
    });

    it('transforms property access used as an attribute value', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => <li class={item.active ? 'active' : ''}>{item.name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => item().active');
      expect(norm(output)).toContain('() => item().name');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — index parameter
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — index parameter', () => {
    it('transforms index usage in a child expression', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item, index) => <li class={index % 2 === 0 ? 'even' : 'odd'}>{item.name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('() => index()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Already-getter style — no double transform
  // ─────────────────────────────────────────────────────────────────────────

  describe('idempotency', () => {
    it('does not double-transform already getter-style children', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: () => items(),
                children: (item) => <li>{() => item().name}</li>,
              })}
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // Should not get triple-wrapped: () => () => item()().name
      expect(norm(output)).not.toContain('item()()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — component call arguments
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — component call arguments', () => {
    it('rewrites item.x in NavLink({ href: item.href, children: item.label })', () => {
      const input = `
        const NAV = [{ label: 'Home', href: '/' }];
        function App() {
          return (<nav>{For({ each: NAV, children: (item) => NavLink({ href: item.href, children: item.label }) })}</nav>);
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('href: item().href');
      expect(output).toContain('children: item().label');
    });

    it('rewrites item.x in a plain function call argument', () => {
      const input = `
        function List() {
          return (<ul>{For({ each: items(), children: (item) => renderRow({ id: item.id, name: item.name }) })}</ul>);
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('id: item().id');
      expect(output).toContain('name: item().name');
    });

    it('rewrites bare item passed as positional argument', () => {
      const input = `
        function List() {
          return (<ul>{For({ each: items(), children: (item) => MyComp({ value: item }) })}</ul>);
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('value: item()');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // children prop — event handler bodies
  // ─────────────────────────────────────────────────────────────────────────

  describe('children — event handler param rewrite', () => {
    it('rewrites item.id inside an onclick arrow body', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => navigate(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      // item.id inside the event handler must become item().id
      expect(output).toContain('navigate(item().id)');
      // item.name in JSX text must still be wrapped in a getter
      expect(output).toContain('() => item().name');
    });

    it('rewrites bare item param passed as argument inside onclick', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => handleClick(item)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('handleClick(item())');
    });

    it('rewrites item prop in a block-body event handler', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => { doThing(item.id); }}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('doThing(item().id)');
    });

    it('does not wrap the event handler itself in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onclick={() => navigate(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input));
      // The onclick value should remain a function, not () => (() => ...)
      expect(output).not.toContain('onclick: () => () =>');
    });

    it('handles onPointerDown and other on* events too', () => {
      const input = `
        function List() {
          return (
            <ul>
              {For({
                each: items(),
                children: (item) => (
                  <li onPointerDown={() => select(item.id)}>{item.name}</li>
                ),
              })}
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('select(item().id)');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Show() — when prop auto-wrapping
  // ─────────────────────────────────────────────────────────────────────────

  describe('Show() when prop', () => {
    it('wraps a signal call in a getter', () => {
      const input = `
        function App() {
          return Show({ when: isLoading(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: () => isLoading()');
    });

    it('wraps a logical expression in a getter', () => {
      const input = `
        function App() {
          return Show({ when: isLoading() && !data(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: () => isLoading()');
    });

    it('leaves an already-getter when unwrapped', () => {
      const input = `
        function App() {
          return Show({ when: () => isLoading(), children: () => <div>Loading</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).not.toContain('when: () => () =>');
    });

    it('leaves a boolean literal unwrapped', () => {
      const input = `
        function App() {
          return Show({ when: true, children: () => <div>Always</div> });
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).toContain('when: true');
      expect(norm(output)).not.toContain('when: () => true');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // JSX tag syntax — <For> and <Show> as tags (#49, #50)
  // ─────────────────────────────────────────────────────────────────────────

  describe('<For> JSX tag syntax', () => {
    // JSX tags are converted to h(For, { "each": ... }, children) — the
    // attribute key is quoted. Use a loose pattern that matches both styles.
    it('wraps each attribute in a getter', () => {
      const input = `
        function List() {
          return (
            <ul>
              <For each={items()}>
                {(item) => <li>{item.name}</li>}
              </For>
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input));
      expect(output).toContain('() => items()');
    });

    it('rewrites item.name to () => item().name in children', () => {
      const input = `
        function List() {
          return (
            <ul>
              <For each={items()}>
                {(item) => <li>{item.name}</li>}
              </For>
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('() => item().name');
    });

    it('leaves an already-getter each unwrapped', () => {
      const input = `
        function List() {
          return (
            <ul>
              <For each={() => items()}>
                {(item) => <li>{item.name}</li>}
              </For>
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input));
      // Must not double-wrap: () => () => items()
      expect(output).not.toContain('() => () => items()');
    });

    it('rewrites item.id inside onclick handler', () => {
      const input = `
        function List() {
          return (
            <ul>
              <For each={items()}>
                {(item) => <li onclick={() => select(item.id)}>{item.name}</li>}
              </For>
            </ul>
          );
        }
      `;
      const output = norm(transformCode(input)).replace(/\(\)\.\s+/g, '().');
      expect(output).toContain('select(item().id)');
      expect(output).toContain('() => item().name');
    });

    it('passes plain T to children, not () => T (regression for #49)', () => {
      // The children callback should receive a plain item that the transform has
      // rewritten to use item() internally — NOT an outer getter wrapping the fn.
      const input = `
        function List() {
          return (
            <ul>
              <For each={items()}>
                {(item) => <li>{item.name}</li>}
              </For>
            </ul>
          );
        }
      `;
      const output = transformCode(input);
      // The children arrow function must NOT be wrapped in an additional getter
      // i.e. children prop should NOT be () => (item) => ...
      expect(norm(output)).not.toMatch(/children:\s*\(\)\s*=>/);
    });
  });

  describe('<Show> JSX tag syntax', () => {
    it('wraps when attribute in a getter', () => {
      const input = `
        function App() {
          return (
            <Show when={isLoading()}>
              {() => <div>Loading</div>}
            </Show>
          );
        }
      `;
      const output = norm(transformCode(input));
      expect(output).toContain('() => isLoading()');
    });

    it('leaves an already-getter when unwrapped', () => {
      const input = `
        function App() {
          return (
            <Show when={() => isLoading()}>
              {() => <div>Loading</div>}
            </Show>
          );
        }
      `;
      const output = norm(transformCode(input));
      // Must not double-wrap
      expect(output).not.toContain('() => () => isLoading()');
    });

    it('leaves a boolean literal unwrapped', () => {
      const input = `
        function App() {
          return (
            <Show when={true}>
              {() => <div>Always</div>}
            </Show>
          );
        }
      `;
      const output = transformCode(input);
      expect(norm(output)).not.toContain('when: () => true');
    });

    it('passes children function as-is — not wrapped in a getter (regression for #50)', () => {
      const input = `
        function App() {
          return (
            <Show when={isVisible()}>
              {() => <div>Content</div>}
            </Show>
          );
        }
      `;
      const output = transformCode(input);
      // children must NOT be double-wrapped: () => () => <div>
      expect(norm(output)).not.toMatch(/children:\s*\(\)\s*=>\s*\(\)\s*=>/);
    });
  });
});
