import { createComponent } from 'liteforge';

export const About = createComponent({
  name: 'About',
  component() {
    return (
      <div class="page">
        <h1>About LiteForge</h1>
        <p class="lead">
          A signals-based frontend framework built for the modern web.
        </p>

        <ul class="feature-list">
          <li>Signals-based reactivity — automatic dependency tracking</li>
          <li>No Virtual DOM — direct, fine-grained DOM updates</li>
          <li>JSX syntax — compiled to DOM operations at build time</li>
          <li>Plugin system — router, modal, query via .use()</li>
          <li>TypeScript-first — full strict mode throughout</li>
          <li>Zero runtime dependencies</li>
        </ul>

        <p>
          <a
            href="https://github.com/SchildW3rk/liteforge"
            target="_blank"
            rel="noopener"
            class="link"
          >
            GitHub →
          </a>
        </p>
      </div>
    );
  },
});
