import { defineComponent } from 'liteforge';
import { RouterOutlet } from '@liteforge/router';

export const App = defineComponent({
  name: 'App',
  component() {
    return <div id="docs-root">{RouterOutlet()}</div>;
  },
});
