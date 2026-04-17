/**
 * Toasts Demo Page
 *
 * Demonstrates @liteforge/toast:
 * - toast.success / error / warning / info
 * - toast.promise
 * - Custom duration & closable options
 * - toast.dismissAll
 */

import { defineComponent } from 'liteforge';
import { toast } from 'liteforge/toast';

// Simulated async operation
function fakeApiCall(succeed: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (succeed) resolve('Data loaded');
      else reject(new Error('Network error'));
    }, 2000);
  });
}

export const ToastsPage = defineComponent({
  name: 'ToastsPage',
  component() {
    return (
      <div class="page">
        <h1>Toasts</h1>
        <p class="page-desc">
          Imperative signal-based toast notifications via <code>@liteforge/toast</code>.
          The <code>ToastProvider</code> is mounted once by <code>toastPlugin()</code> in{' '}
          <code>main.tsx</code> — call <code>toast.*</code> from anywhere.
        </p>

        <section class="demo-section">
          <h2>Types</h2>
          <div class="demo-row">
            <button
              type="button"
              class="btn btn-success"
              onClick={() => toast.success('Changes saved successfully!')}
            >
              success
            </button>
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => toast.error('Something went wrong.')}
            >
              error
            </button>
            <button
              type="button"
              class="btn btn-warning"
              onClick={() => toast.warning('Disk space is low.')}
            >
              warning
            </button>
            <button
              type="button"
              class="btn"
              onClick={() => toast.info('A new version is available.')}
            >
              info
            </button>
          </div>
        </section>

        <section class="demo-section">
          <h2>Options</h2>
          <div class="demo-row">
            <button
              type="button"
              class="btn"
              onClick={() => toast.success('This stays until you close it.', { duration: 0 })}
            >
              persistent (duration: 0)
            </button>
            <button
              type="button"
              class="btn"
              onClick={() => toast.info('Gone in 1 second.', { duration: 1000 })}
            >
              1 second
            </button>
            <button
              type="button"
              class="btn"
              onClick={() => toast.warning('No close button.', { closable: false })}
            >
              no close button
            </button>
          </div>
        </section>

        <section class="demo-section">
          <h2>Promise</h2>
          <div class="demo-row">
            <button
              type="button"
              class="btn"
              onClick={() => {
                void toast.promise(fakeApiCall(true), {
                  loading: 'Fetching data…',
                  success: (r) => `Done: ${r as string}`,
                  error: 'Failed to load',
                });
              }}
            >
              promise (success)
            </button>
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => {
                void toast.promise(fakeApiCall(false), {
                  loading: 'Fetching data…',
                  success: 'Done!',
                  error: (e) => `Error: ${(e as Error).message}`,
                });
              }}
            >
              promise (error)
            </button>
          </div>
        </section>

        <section class="demo-section">
          <h2>Dismiss</h2>
          <div class="demo-row">
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => toast.dismissAll()}
            >
              dismiss all
            </button>
          </div>
        </section>

        <style>{`
          .page-desc { color: var(--text-secondary, #888); margin-bottom: 2rem; line-height: 1.6; }
          .page-desc code { background: var(--code-bg, rgba(128,128,128,0.15)); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
          .demo-section { margin-bottom: 2.5rem; }
          .demo-section h2 { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; opacity: 0.7; text-transform: uppercase; letter-spacing: 0.05em; }
          .demo-row { display: flex; flex-wrap: wrap; gap: 10px; }
          .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid var(--border, rgba(128,128,128,0.3)); background: var(--surface, rgba(128,128,128,0.1)); color: inherit; cursor: pointer; font-size: 14px; transition: opacity 0.15s; }
          .btn:hover { opacity: 0.8; }
          .btn-success { background: rgba(166,227,161,0.2); border-color: #a6e3a1; color: #a6e3a1; }
          .btn-danger  { background: rgba(243,139,168,0.2); border-color: #f38ba8; color: #f38ba8; }
          .btn-warning { background: rgba(249,226,175,0.2); border-color: #f9e2af; color: #f9e2af; }
        `}</style>
      </div>
    );
  },
});
