/**
 * Client Demo Page
 *
 * Demonstrates @liteforge/client:
 * - createClient with baseUrl
 * - resource-based CRUD (getList, getOne, create)
 * - Low-level client.get()
 * - Request interceptor (logging)
 * - ApiError handling
 * - Loading state via local signals
 */

import { createComponent } from '@liteforge/runtime';
import { signal } from '@liteforge/core';
import { createClient, ApiError } from '@liteforge/client';
import type { RequestConfig, ResponseContext } from '@liteforge/client';

// ============================================================================
// Types (JSONPlaceholder)
// ============================================================================

interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const ClientPage = createComponent({
  name: 'ClientPage',
  component() {
    // ------------------------------------------------------------------
    // Client setup
    // ------------------------------------------------------------------
    const client = createClient({
      baseUrl: 'https://jsonplaceholder.typicode.com',
      headers: { 'X-Demo': 'liteforge-client' },
    });

    // Log every outgoing request to the devtools console
    client.addInterceptor({
      onRequest: (cfg: RequestConfig) => {
        console.log('[Client] Request →', cfg.method, cfg.url);
        return cfg;
      },
      onResponse: (ctx: ResponseContext<unknown>) => {
        console.log('[Client] Response ←', ctx.status, ctx.config.url);
        return ctx;
      },
    });

    const posts = client.resource<Post>('posts');

    // ------------------------------------------------------------------
    // Reactive state
    // ------------------------------------------------------------------
    const postList = signal<Post[]>([]);
    const selectedPost = signal<Post | null>(null);
    const todo = signal<Todo | null>(null);
    const createResult = signal<Post | null>(null);
    const errorMsg = signal<string>('');

    const loadingList = signal(false);
    const loadingOne = signal(false);
    const loadingTodo = signal(false);
    const loadingCreate = signal(false);

    // ------------------------------------------------------------------
    // Actions
    // ------------------------------------------------------------------
    async function fetchList() {
      errorMsg.set('');
      loadingList.set(true);
      try {
        // JSONPlaceholder returns a plain array, not { data, meta }
        // Use low-level client.get with ?_limit query param
        const items = await client.get<Post[]>('/posts', { params: { _limit: 5 } });
        postList.set(items);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          errorMsg.set(`ApiError ${err.status}: ${err.statusText}`);
        } else {
          errorMsg.set('Network error');
        }
      } finally {
        loadingList.set(false);
      }
    }

    async function fetchOne() {
      errorMsg.set('');
      loadingOne.set(true);
      try {
        const post = await posts.getOne(1);
        selectedPost.set(post);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          errorMsg.set(`ApiError ${err.status}: ${err.statusText}`);
        } else {
          errorMsg.set('Network error');
        }
      } finally {
        loadingOne.set(false);
      }
    }

    async function fetchTodo() {
      errorMsg.set('');
      loadingTodo.set(true);
      try {
        const result = await client.get<Todo>('/todos/1');
        todo.set(result);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          errorMsg.set(`ApiError ${err.status}: ${err.statusText}`);
        } else {
          errorMsg.set('Network error');
        }
      } finally {
        loadingTodo.set(false);
      }
    }

    async function createPost() {
      errorMsg.set('');
      loadingCreate.set(true);
      try {
        const newPost = await posts.create({
          userId: 1,
          title: 'Hello from LiteForge Client',
          body: 'This is a demo post created via @liteforge/client.',
        });
        createResult.set(newPost);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          errorMsg.set(`ApiError ${err.status}: ${err.statusText}`);
        } else {
          errorMsg.set('Network error');
        }
      } finally {
        loadingCreate.set(false);
      }
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
      <div class="client-page">
        <style>{`
          .client-page { padding: 2rem; max-width: 900px; }
          .client-page h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
          .client-page .subtitle { color: var(--color-text-secondary, #6b7280); margin-bottom: 2rem; }
          .demo-section { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }
          .demo-section h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
          .demo-section p { font-size: 0.875rem; color: var(--color-text-secondary, #6b7280); margin-bottom: 0.75rem; }
          .demo-btn { background: var(--color-primary, #3b82f6); color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.875rem; margin-right: 0.5rem; }
          .demo-btn:hover { opacity: 0.9; }
          .result-box { margin-top: 1rem; background: var(--color-surface-alt, #f9fafb); border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; padding: 1rem; font-size: 0.8125rem; font-family: monospace; white-space: pre-wrap; max-height: 200px; overflow: auto; }
          .error-banner { margin-top: 1rem; background: #fee2e2; border: 1px solid #fca5a5; border-radius: 0.5rem; padding: 0.75rem 1rem; color: #991b1b; font-size: 0.875rem; }
          .loading-text { color: var(--color-text-secondary, #6b7280); font-size: 0.875rem; margin-top: 0.5rem; }
          .post-item { padding: 0.5rem 0; border-bottom: 1px solid var(--color-border, #e5e7eb); }
          .post-item:last-child { border-bottom: none; }
          .post-title { font-weight: 500; font-size: 0.875rem; }
          .post-id { font-size: 0.75rem; color: var(--color-text-secondary, #6b7280); }
          .badge { display: inline-block; background: #dcfce7; color: #166534; border-radius: 9999px; padding: 0.125rem 0.5rem; font-size: 0.75rem; font-weight: 600; }
        `}</style>

        <h1>@liteforge/client Demo</h1>
        <p class="subtitle">
          Zero-dependency HTTP client with resource-based CRUD, interceptors, and middleware.
          All requests hit <strong>jsonplaceholder.typicode.com</strong>. Check the console for interceptor logs.
        </p>

        {/* Error banner */}
        {() => errorMsg() !== '' ? (
          <div class="error-banner">{() => errorMsg()}</div>
        ) : null}

        {/* Section 1: getList */}
        <div class="demo-section">
          <h2>resource.getList()</h2>
          <p>Fetches the first 5 posts via <code>client.get('/posts', {'{ params: { _limit: 5 } }'})</code>. JSONPlaceholder returns a plain array, not a paginated wrapper.</p>
          <button type="button" class="demo-btn" onclick={fetchList}>
            Fetch Posts
          </button>
          {() => loadingList() ? <p class="loading-text">Loading...</p> : null}
          {() => postList().length > 0 ? (
            <div class="result-box">
              {() => postList().map((p) => (
                <div class="post-item">
                  <span class="post-id">#{p.id} </span>
                  <span class="post-title">{p.title}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Section 2: getOne */}
        <div class="demo-section">
          <h2>resource.getOne(id)</h2>
          <p>Fetches a single post from <code>/posts/1</code>.</p>
          <button type="button" class="demo-btn" onclick={fetchOne}>
            Fetch Post #1
          </button>
          {() => loadingOne() ? <p class="loading-text">Loading...</p> : null}
          {() => selectedPost() !== null ? (
            <div class="result-box">{() => JSON.stringify(selectedPost(), null, 2)}</div>
          ) : null}
        </div>

        {/* Section 3: create */}
        <div class="demo-section">
          <h2>resource.create(data)</h2>
          <p>
            POSTs a new post to <code>/posts</code>.
            JSONPlaceholder accepts but does not persist it — response includes a synthetic <code>id</code>.
          </p>
          <button type="button" class="demo-btn" onclick={createPost}>
            Create Post
          </button>
          {() => loadingCreate() ? <p class="loading-text">Loading...</p> : null}
          {() => createResult() !== null ? (
            <div class="result-box">
              <span class="badge">Created</span>
              {' '}
              {() => JSON.stringify(createResult(), null, 2)}
            </div>
          ) : null}
        </div>

        {/* Section 4: low-level get */}
        <div class="demo-section">
          <h2>client.get&lt;T&gt;(path)</h2>
          <p>Low-level request — fetches a single todo from <code>/todos/1</code>.</p>
          <button type="button" class="demo-btn" onclick={fetchTodo}>
            Fetch Todo
          </button>
          {() => loadingTodo() ? <p class="loading-text">Loading...</p> : null}
          {() => todo() !== null ? (
            <div class="result-box">{() => JSON.stringify(todo(), null, 2)}</div>
          ) : null}
        </div>
      </div>
    );
  },
});
