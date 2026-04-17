import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  defineComponent,
  initAppContext,
  clearContext,
} from '../src/index.js';

describe('async component loading', () => {
  let container: HTMLElement;

  beforeEach(() => {
    clearContext();
    initAppContext({ api: { get: vi.fn() } });
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('load lifecycle', () => {
    it('should show placeholder while loading', async () => {
      let resolveLoad: (value: unknown) => void;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      const MyComponent = defineComponent({
        load: async () => {
          await loadPromise;
          return { data: 'loaded' };
        },
        placeholder: () => document.createTextNode('Loading...'),
        component: ({ data }) => document.createTextNode(data.data),
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Should show placeholder immediately
      expect(container.textContent).toBe('Loading...');

      // Resolve loading
      resolveLoad!({ data: 'loaded' });
      await loadPromise;

      // Wait for microtask
      await new Promise((r) => setTimeout(r, 0));

      expect(container.textContent).toBe('loaded');
    });

    it('should use comment node as default placeholder', async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });

      const MyComponent = defineComponent({
        load: async () => {
          await loadPromise;
          return {};
        },
        component: () => document.createTextNode('Loaded'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Should have a comment node as placeholder
      expect(container.childNodes.length).toBe(1);
      expect(container.childNodes[0]?.nodeType).toBe(Node.COMMENT_NODE);

      resolveLoad!();
      await loadPromise;
      await new Promise((r) => setTimeout(r, 0));

      expect(container.textContent).toBe('Loaded');
    });

    it('should pass props and setup to load', async () => {
      const loadSpy = vi.fn().mockResolvedValue({ result: 'data' });

      const MyComponent = defineComponent({
        setup: ({ props }) => ({ doubled: (props.count as number) * 2 }),
        load: loadSpy,
        component: () => document.createTextNode('Loaded'),
      });

      const instance = MyComponent({ count: 5 });
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(loadSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          props: { count: 5 },
          setup: { doubled: 10 },
        })
      );
    });

    it('should provide use() in load', async () => {
      initAppContext({ apiUrl: 'https://api.example.com' });

      let capturedUrl: string | undefined;

      const MyComponent = defineComponent({
        load: async ({ use }) => {
          capturedUrl = use('apiUrl');
          return {};
        },
        component: () => document.createTextNode('Loaded'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(capturedUrl).toBe('https://api.example.com');
    });

    it('should guarantee data in component function', async () => {
      const MyComponent = defineComponent({
        load: async () => ({ user: { name: 'John' } }),
        component: ({ data }) => {
          // data.user is guaranteed to exist - no null checks needed
          return document.createTextNode(`Hello ${data.user.name}`);
        },
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(container.textContent).toBe('Hello John');
    });
  });

  describe('error handling', () => {
    it('should show error component on load failure', async () => {
      const MyComponent = defineComponent({
        load: async () => {
          throw new Error('Network error');
        },
        error: ({ error }) => {
          const div = document.createElement('div');
          div.className = 'error';
          div.textContent = error.message;
          return div;
        },
        component: () => document.createTextNode('Success'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(container.querySelector('.error')?.textContent).toBe('Network error');
    });

    it('should show default error text without error component', async () => {
      const MyComponent = defineComponent({
        load: async () => {
          throw new Error('Something went wrong');
        },
        component: () => document.createTextNode('Success'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(container.textContent).toBe('Error: Something went wrong');
    });

    it('should provide retry function in error', async () => {
      let loadAttempts = 0;

      const MyComponent = defineComponent({
        load: async () => {
          loadAttempts++;
          if (loadAttempts < 2) {
            throw new Error('First attempt fails');
          }
          return { success: true };
        },
        placeholder: () => document.createTextNode('Loading...'),
        error: ({ retry }) => {
          const button = document.createElement('button');
          button.textContent = 'Retry';
          button.onclick = retry;
          return button;
        },
        component: () => document.createTextNode('Success!'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      // Should be showing error with retry button
      expect(loadAttempts).toBe(1);
      const button = container.querySelector('button');
      expect(button?.textContent).toBe('Retry');

      // Click retry
      button?.click();

      // Should show placeholder again
      expect(container.textContent).toBe('Loading...');

      await new Promise((r) => setTimeout(r, 0));

      // Should now show success
      expect(loadAttempts).toBe(2);
      expect(container.textContent).toBe('Success!');
    });

    it('should convert non-Error throws to Error', async () => {
      const MyComponent = defineComponent({
        load: async () => {
          throw 'string error';
        },
        error: ({ error }) => document.createTextNode(error.message),
        component: () => document.createTextNode('Success'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      await new Promise((r) => setTimeout(r, 0));

      expect(container.textContent).toBe('string error');
    });
  });

  describe('unmount during loading', () => {
    it('should not render if unmounted during load', async () => {
      let resolveLoad: () => void;
      const loadPromise = new Promise<void>((resolve) => {
        resolveLoad = resolve;
      });

      const componentSpy = vi.fn(() => document.createTextNode('Loaded'));

      const MyComponent = defineComponent({
        load: async () => {
          await loadPromise;
          return {};
        },
        component: componentSpy,
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Unmount while loading
      instance.unmount();

      // Resolve load
      resolveLoad!();
      await loadPromise;
      await new Promise((r) => setTimeout(r, 0));

      // Component should not have been called
      expect(componentSpy).not.toHaveBeenCalled();
    });

    it('should not render error if unmounted during load', async () => {
      const errorSpy = vi.fn(() => document.createTextNode('Error'));

      const MyComponent = defineComponent({
        load: async () => {
          throw new Error('Failed');
        },
        error: errorSpy,
        component: () => document.createTextNode('Success'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Unmount immediately
      instance.unmount();

      await new Promise((r) => setTimeout(r, 0));

      // Error component should not have been called
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe('mounted with async load', () => {
    it('should call mounted only after load completes', async () => {
      const mountedSpy = vi.fn();

      const MyComponent = defineComponent({
        load: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return { loaded: true };
        },
        component: () => document.createElement('div'),
        mounted: ({ data }) => {
          mountedSpy(data);
        },
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Mounted should not be called yet
      expect(mountedSpy).not.toHaveBeenCalled();

      // Wait for load to complete
      await new Promise((r) => setTimeout(r, 20));

      expect(mountedSpy).toHaveBeenCalledWith({ loaded: true });
    });
  });

  describe('use() in lifecycle methods', () => {
    it('should access app-level context inside setup() via args', () => {
      // Set up app-level context
      initAppContext({
        config: { theme: 'dark', locale: 'de' },
        version: '1.0.0',
      });

      let capturedConfig: { theme: string; locale: string } | undefined;
      let capturedVersion: string | undefined;

      const MyComponent = defineComponent({
        setup: ({ use }) => {
          // use() is passed via args for consistent API across all lifecycle methods
          capturedConfig = use('config');
          capturedVersion = use('version');
          return { ready: true };
        },
        component: ({ setup }) => {
          return document.createTextNode(setup.ready ? 'Ready' : 'Not ready');
        },
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Verify setup() could access context via args.use
      expect(capturedConfig).toEqual({ theme: 'dark', locale: 'de' });
      expect(capturedVersion).toBe('1.0.0');
      expect(container.textContent).toBe('Ready');
    });

    it('should access app-level context inside mounted() via args', async () => {
      // Set up app-level context
      initAppContext({
        analytics: { track: vi.fn() },
        appName: 'TestApp',
      });

      let capturedAppName: string | undefined;
      let capturedAnalytics: { track: ReturnType<typeof vi.fn> } | undefined;

      const MyComponent = defineComponent({
        load: async () => {
          await new Promise((r) => setTimeout(r, 5));
          return { data: 'loaded' };
        },
        component: () => {
          const div = document.createElement('div');
          div.textContent = 'Content';
          return div;
        },
        mounted: ({ use }) => {
          // use() is passed via args for consistent API across all lifecycle methods
          capturedAppName = use('appName');
          capturedAnalytics = use('analytics');
          
          // Simulate tracking a page view
          capturedAnalytics?.track('page_view');
        },
      });

      const instance = MyComponent({});
      instance.mount(container);

      // Wait for load to complete and mounted to be called
      await new Promise((r) => setTimeout(r, 20));

      // Verify mounted() could access context via args.use
      expect(capturedAppName).toBe('TestApp');
      expect(capturedAnalytics).toBeDefined();
      expect(capturedAnalytics?.track).toHaveBeenCalledWith('page_view');
    });
  });
});
