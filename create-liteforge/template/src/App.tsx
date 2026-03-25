import { createComponent } from 'liteforge';
import { RouterOutlet, Link } from '@liteforge/router';

export const App = createComponent({
  name: 'App',
  component() {
    return (
      <div class="app">
        <nav>
          <Link href="/" class="nav-link">Home</Link>
          <Link href="/about" class="nav-link">About</Link>
        </nav>
        <main>
          {RouterOutlet()}
        </main>
      </div>
    );
  },
});
