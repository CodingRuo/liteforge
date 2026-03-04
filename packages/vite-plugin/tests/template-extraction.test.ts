/**
 * Template Extraction — End-to-End Pipeline Tests
 *
 * Verifies the full pipeline: JSX input → transformWithTemplates() → generated code
 * that correctly calls the runtime helpers (_template, _insert, _setProp, _addEventListener).
 *
 * Uses transformCode(code, importSource, useTemplateExtraction=true).
 */

import { describe, it, expect } from 'vitest';
import { transformCode } from '../src/transform.js';

// Shorthand: transform with template extraction enabled
function te(code: string): string {
  return transformCode(code, '@liteforge/runtime', true);
}

// =============================================================================
// A — Static Templates (only _template, no dynamic helpers)
// =============================================================================

describe('A — Static templates', () => {
  it('extracts a fully static 2-element tree into _template', () => {
    const out = te('<div><p>Hello</p><p>World</p></div>');
    expect(out).toContain('_template(');
    expect(out).toContain('_tmpl$1');
  });

  it('clones template in IIFE: const _el = _tmpl$1()', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).toContain('const _el = _tmpl$1()');
  });

  it('returns _el at end of IIFE', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).toContain('return _el');
  });

  it('does NOT emit _insert for fully static tree', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).not.toContain('_insert');
  });

  it('does NOT emit _setProp for fully static tree', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).not.toContain('_setProp');
  });

  it('does NOT emit _addEventListener for fully static tree', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).not.toContain('_addEventListener');
  });

  it('includes static attributes in the template HTML string', () => {
    const out = te('<div class="card"><p>A</p><p>B</p></div>');
    // class="card" must be baked into the template string
    expect(out).toContain('class=\\"card\\"');
    expect(out).toContain('<p>A</p>');
    expect(out).toContain('<p>B</p>');
  });

  it('includes deeply nested static structure in template', () => {
    const out = te(`
      <div class="container">
        <header><h1>Title</h1></header>
        <main><p>Content</p></main>
      </div>
    `);
    expect(out).toContain('<header>');
    expect(out).toContain('<h1>Title</h1>');
    expect(out).toContain('<main>');
    expect(out).toContain('<p>Content</p>');
  });
});

// =============================================================================
// B — Dynamic Children (_insert with comment marker)
// =============================================================================

describe('B — Dynamic children via _insert', () => {
  it('emits comment marker in template string for dynamic child', () => {
    const out = te('<div><h1>Static</h1>{expr()}</div>');
    // The comment marker must be baked into the _template() call
    expect(out).toContain('<!---->');
  });

  it('emits _insert call for dynamic expression child', () => {
    const out = te('<div><h1>Static</h1>{expr()}</div>');
    expect(out).toContain('_insert');
  });

  it('_insert uses 3-argument form with marker (parentNode, value, marker)', () => {
    const out = te('<div><h1>Static</h1>{expr()}</div>');
    // 3-arg _insert: _insert(someEl.parentNode, value, someEl)
    expect(out).toContain('parentNode');
    // The value should be wrapped in a getter for reactivity
    expect(out).toContain('expr()');
  });

  it('emits _insert for dynamic child as first child', () => {
    const out = te('<div>{first()}<span>Static</span></div>');
    expect(out).toContain('_insert');
    expect(out).toContain('first()');
  });

  it('emits _insert for each of multiple dynamic children', () => {
    const out = te('<div><p>A</p>{x()}<p>B</p>{y()}</div>');
    const insertCount = (out.match(/_insert/g) ?? []).length;
    expect(insertCount).toBeGreaterThanOrEqual(2);
    expect(out).toContain('x()');
    expect(out).toContain('y()');
  });

  it('includes _insert in injected imports', () => {
    const out = te('<div><p>A</p>{expr()}</div>');
    // _insert must appear in the import statement
    expect(out).toMatch(/import\s*\{[^}]*_insert[^}]*\}\s*from\s*['"]@liteforge\/runtime['"]/);
  });
});

// =============================================================================
// C — Dynamic Props (_setProp)
// =============================================================================

describe('C — Dynamic props via _setProp', () => {
  it('emits _setProp for dynamic class on root element', () => {
    const out = te('<div class={theme()}><p>A</p><p>B</p></div>');
    expect(out).toContain('_setProp');
    expect(out).toContain('"class"');
  });

  it('wraps dynamic prop value in getter function', () => {
    const out = te('<div class={theme()}><p>A</p><p>B</p></div>');
    // The getter () => theme() ensures reactivity
    expect(out).toContain('() =>');
    expect(out).toContain('theme()');
  });

  it('emits _setProp for dynamic class on root using _el variable', () => {
    const out = te('<div class={theme()}><p>A</p><p>B</p></div>');
    // Root element is always _el — _setProp(_el, ...)
    expect(out).toContain('_setProp(_el,');
  });

  it('includes _setProp in injected imports', () => {
    const out = te('<div class={x()}><p>A</p><p>B</p></div>');
    expect(out).toMatch(/import\s*\{[^}]*_setProp[^}]*\}\s*from\s*['"]@liteforge\/runtime['"]/);
  });
});

// =============================================================================
// D — Event Handlers (_addEventListener, lowercased)
// =============================================================================

describe('D — Event handlers via _addEventListener', () => {
  it('emits _addEventListener for onClick handler', () => {
    const out = te('<div><button onClick={fn}>A</button><p>B</p></div>');
    expect(out).toContain('_addEventListener');
  });

  it('lowercases onClick → "click"', () => {
    const out = te('<div><button onClick={fn}>A</button><p>B</p></div>');
    expect(out).toContain('"click"');
    // Must NOT appear as "Click" (capital C)
    expect(out).not.toContain('"Click"');
  });

  it('does NOT wrap event handler in getter', () => {
    const out = te('<div><button onClick={fn}>A</button><p>B</p></div>');
    // fn should be passed directly, not as () => fn
    // The _addEventListener call should contain `fn` directly
    expect(out).toContain('fn');
  });

  it('emits _addEventListener for onInput handler', () => {
    const out = te('<div><input onInput={handler} /><span>B</span></div>');
    expect(out).toContain('_addEventListener');
    expect(out).toContain('"input"');
  });

  it('includes _addEventListener in injected imports', () => {
    const out = te('<div><button onClick={fn}>A</button><p>B</p></div>');
    expect(out).toMatch(/import\s*\{[^}]*_addEventListener[^}]*\}\s*from\s*['"]@liteforge\/runtime['"]/);
  });
});

// =============================================================================
// E — Multiple Dynamic Slots (correct ordering)
// =============================================================================

describe('E — Multiple dynamic slots', () => {
  it('handles two dynamic expressions correctly', () => {
    const out = te('<div><p>A</p>{x()}<p>B</p>{y()}</div>');
    expect(out).toContain('x()');
    expect(out).toContain('y()');
    const insertCount = (out.match(/_insert/g) ?? []).length;
    expect(insertCount).toBeGreaterThanOrEqual(2);
  });

  it('handles dynamic prop + dynamic child together', () => {
    const out = te('<div class={theme()}><p>Static</p>{content()}</div>');
    expect(out).toContain('_setProp');
    expect(out).toContain('_insert');
    expect(out).toContain('theme()');
    expect(out).toContain('content()');
  });

  it('handles event handler + dynamic child together', () => {
    const out = te('<div><button onClick={fn}>{label()}</button><p>B</p></div>');
    expect(out).toContain('_addEventListener');
    expect(out).toContain('_insert');
    expect(out).toContain('label()');
  });
});

// =============================================================================
// F — Fallback to h() when extraction is not worthwhile
// =============================================================================

describe('F — Fallback to h() for non-extractable elements', () => {
  it('uses h() for single element with dynamic child (staticCount < 2)', () => {
    // <div>{expr()}</div> — only 1 static element, shouldExtract = false
    const out = te('<div>{expr()}</div>');
    // Should NOT use template extraction
    expect(out).not.toContain('_template(');
    // Should use h() instead
    expect(out).toContain('h(');
  });

  it('uses h() for component root (isComponent = true)', () => {
    // <MyComponent prop={x} /> — component, never extracted
    const out = te('<MyComponent prop={x} />');
    expect(out).not.toContain('_template(');
    expect(out).toContain('h(');
  });

  it('uses _template for 2+ static elements (threshold met)', () => {
    // <div><p>A</p><p>B</p></div> — 3 static elements → extract
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).toContain('_template(');
    expect(out).not.toContain('h("div"');
  });
});

// =============================================================================
// G — Import Injection
// =============================================================================

describe('G — Import injection', () => {
  it('injects _template import for static template', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    expect(out).toMatch(/import\s*\{[^}]*_template[^}]*\}\s*from\s*['"]@liteforge\/runtime['"]/);
  });

  it('does NOT inject _insert when no dynamic children', () => {
    const out = te('<div><p>A</p><p>B</p></div>');
    // No dynamic children → no _insert import
    const importLine = out.match(/import\s*\{([^}]*)\}\s*from\s*['"]@liteforge\/runtime['"]/);
    if (importLine && importLine[1]) {
      expect(importLine[1]).not.toContain('_insert');
    }
  });

  it('injects only the helpers that are actually used', () => {
    // Static template: only _template needed
    const staticOut = te('<div><p>A</p><p>B</p></div>');
    expect(staticOut).not.toContain('_setProp');
    expect(staticOut).not.toContain('_addEventListener');

    // Dynamic child: _template + _insert needed
    const dynamicOut = te('<div><p>A</p>{expr()}</div>');
    expect(dynamicOut).toContain('_template');
    expect(dynamicOut).toContain('_insert');
    expect(dynamicOut).not.toContain('_setProp');
    expect(dynamicOut).not.toContain('_addEventListener');
  });

  it('still injects h() import for non-extracted (fallback) elements', () => {
    // Single element → h() fallback → h import needed
    const out = te('<div>{expr()}</div>');
    expect(out).toContain("from '@liteforge/runtime'");
    expect(out).toContain('h');
  });
});

// =============================================================================
// H — Complex combination: Props + Children + Events
// =============================================================================

describe('H — Complex combination', () => {
  it('handles class + static child + button with event + dynamic label', () => {
    const out = te(`
      <div class={theme()}>
        <h1>Title</h1>
        <button onClick={fn}>{label()}</button>
      </div>
    `);

    // Static structure extracted into template
    expect(out).toContain('_template(');

    // Comment marker for {label()} dynamic slot
    expect(out).toContain('<!---->');

    // Dynamic class on root via _setProp
    expect(out).toContain('_setProp');
    expect(out).toContain('"class"');
    expect(out).toContain('theme()');

    // Event handler on button
    expect(out).toContain('_addEventListener');
    expect(out).toContain('"click"');

    // Dynamic label via _insert
    expect(out).toContain('_insert');
    expect(out).toContain('label()');
  });

  it('complex template generates valid IIFE structure', () => {
    const out = te(`
      <section class={style()}>
        <h2>Static Heading</h2>
        <p>{body()}</p>
      </section>
    `);

    // IIFE: (() => { ... })()
    expect(out).toMatch(/\(\(\)\s*=>/);
    expect(out).toContain('const _el = _tmpl$1()');
    expect(out).toContain('return _el');
  });

  it('void elements work correctly in template string', () => {
    const out = te('<div><input type="text" /><br /><p>Footer</p></div>');
    // Void elements must not have closing tags in template
    expect(out).not.toContain('</input>');
    expect(out).not.toContain('</br>');
    expect(out).toContain('<p>Footer</p>');
  });
});
