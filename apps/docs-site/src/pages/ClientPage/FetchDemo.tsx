import { createComponent, For, Show } from 'liteforge';
import { signal } from 'liteforge';
import { btnClass } from '../../components/Button.js';

interface Post { id: number; title: string; body: string; }

export const FetchDemo = createComponent({
  name: 'FetchDemo',
  component() {
    const loading = signal(false);
    const error   = signal<string | null>(null);
    const posts   = signal<Post[]>([]);
    const page    = signal(1);

    const fetchPosts = async () => {
      loading.set(true);
      error.set(null);
      try {
        const res = await fetch(
          `https://jsonplaceholder.typicode.com/posts?_page=${page()}&_limit=3`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        posts.set(await res.json());
      } catch (e) {
        error.set(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        loading.set(false);
      }
    };

    const simulateError = () => {
      loading.set(false);
      error.set('HTTP 404: Not Found (simulated ApiError)');
      posts.set([]);
    };

    const prev = () => { if (page() > 1) { page.update(p => p - 1); fetchPosts(); } };
    const next = () => { page.update(p => p + 1); fetchPosts(); };

    return (
      <div class="space-y-3">
        {/* Controls */}
        <div class="flex items-center gap-2">
          <button class={btnClass('primary', 'sm')} onclick={fetchPosts}>
            Fetch posts
          </button>
          <button class={btnClass('secondary', 'sm')} onclick={simulateError}>
            Simulate error
          </button>
          <button class={btnClass('secondary', 'sm')} onclick={prev}>←</button>
          <span class="text-xs text-[var(--content-muted)] font-mono">{() => `page ${page()}`}</span>
          <button class={btnClass('secondary', 'sm')} onclick={next}>→</button>
        </div>

        {/* Loading */}
        {Show({
          when: loading,
          children: () => (
            <p class="text-sm text-[var(--content-secondary)] animate-pulse py-1">Loading...</p>
          ),
        })}

        {/* Error */}
        {Show({
          when: () => error() !== null,
          children: () => (
            <div class="p-3 rounded border border-red-500/30 bg-red-950/20 text-sm text-red-300">
              {() => error()}
            </div>
          ),
        })}

        {/* Posts */}
        {Show({
          when: () => posts().length > 0,
          children: () => (
            <div class="space-y-2">
              {For({
                each: posts,
                key: p => p.id,
                children: post => (
                  <div class="p-3 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/60">
                    <p class="text-xs font-medium text-[var(--content-primary)] mb-1">
                      {() => `#${post.id} ${post.title}`}
                    </p>
                    <p class="text-xs text-[var(--content-muted)] line-clamp-2">{post.body}</p>
                  </div>
                ),
              })}
            </div>
          ),
        })}

        {/* Empty state */}
        {Show({
          when: () => !loading() && error() === null && posts().length === 0,
          children: () => (
            <p class="text-sm text-[var(--content-subtle)] py-1">
              Click "Fetch posts" to load data from jsonplaceholder.typicode.com
            </p>
          ),
        })}
      </div>
    );
  },
});
