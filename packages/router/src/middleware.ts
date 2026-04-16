import type {
  RouteMiddleware,
  MiddlewareFunction,
  MiddlewareContext,
  NavigationTarget,
} from './types.js';

// =============================================================================
// Middleware Definition
// =============================================================================

/**
 * Define a named route middleware
 *
 * @example
 * ```ts
 * const loggerMiddleware = defineMiddleware('logger', async (ctx, next) => {
 *   console.log(`Navigating from ${ctx.from?.path} to ${ctx.to.path}`);
 *   await next();
 *   console.log(`Navigation complete to ${ctx.to.path}`);
 * });
 *
 * const analyticsMiddleware = defineMiddleware('analytics', async (ctx, next) => {
 *   const analytics = ctx.use('analytics');
 *   analytics.track('page_view', { path: ctx.to.path });
 *   await next();
 * });
 * ```
 */
export function defineMiddleware(name: string, handler: MiddlewareFunction): RouteMiddleware {
  return { name, handler };
}

// =============================================================================
// Middleware Execution
// =============================================================================

/**
 * Compose multiple middleware into a single function
 * Uses an onion-style execution model (like Koa)
 */
export function composeMiddleware(
  middleware: RouteMiddleware[]
): (context: MiddlewareContext) => Promise<{ redirect?: NavigationTarget }> {
  return async function composed(context: MiddlewareContext): Promise<{ redirect?: NavigationTarget }> {
    let index = -1;
    let redirectResult: NavigationTarget | undefined;

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error('next() called multiple times in middleware');
      }
      index = i;

      if (i >= middleware.length) {
        // All middleware executed
        return;
      }

      const mw = middleware[i]!;

      try {
        const result = await mw.handler(context, () => dispatch(i + 1));

        // Check if middleware returned a redirect
        if (result !== undefined && result !== null) {
          // Middleware wants to redirect
          redirectResult = result as NavigationTarget;
          // Don't continue to next middleware
          return;
        }
      } catch (error) {
        if ((import.meta.env as { DEV?: boolean } | undefined)?.DEV) {
          console.error(`Middleware "${mw.name}" threw an error:`, error);
        }
        throw error;
      }
    }

    await dispatch(0);

    return redirectResult !== undefined ? { redirect: redirectResult } : {};
  };
}

/**
 * Run middleware chain with abort capability
 */
export async function runMiddleware(
  middleware: RouteMiddleware[],
  context: MiddlewareContext
): Promise<{ completed: boolean; redirect?: NavigationTarget }> {
  if (middleware.length === 0) {
    return { completed: true };
  }

  try {
    const composed = composeMiddleware(middleware);
    const result = await composed(context);

    if (result.redirect) {
      return { completed: false, redirect: result.redirect };
    }

    return { completed: true };
  } catch (error) {
    if ((import.meta.env as { DEV?: boolean } | undefined)?.DEV) {
      console.error('Middleware chain error:', error);
    }
    return { completed: false };
  }
}

// =============================================================================
// Built-in Middleware
// =============================================================================

/**
 * Create a logger middleware
 */
export function createLoggerMiddleware(
  options: {
    prefix?: string;
    logTiming?: boolean;
  } = {}
): RouteMiddleware {
  const { prefix = '[Router]', logTiming = false } = options;

  return defineMiddleware('logger', async (ctx, next) => {
    const fromPath = ctx.from?.path ?? '(initial)';
    const toPath = ctx.to.path;

    if (logTiming) {
      const start = performance.now();
      console.log(`${prefix} ${fromPath} → ${toPath}`);
      await next();
      const duration = (performance.now() - start).toFixed(2);
      console.log(`${prefix} Navigation complete (${duration}ms)`);
    } else {
      console.log(`${prefix} ${fromPath} → ${toPath}`);
      await next();
    }
  });
}

/* v8 ignore start - DOM-dependent middlewares, tested with Playwright */

/**
 * Create a scroll restoration middleware
 */
export function createScrollMiddleware(
  options: {
    behavior?: ScrollBehavior;
    scrollToHash?: boolean;
  } = {}
): RouteMiddleware {
  const { behavior = 'auto', scrollToHash = true } = options;
  const scrollPositions = new Map<string, { x: number; y: number }>();

  return defineMiddleware('scroll', async (ctx, next) => {
    // Save current scroll position before navigation
    if (ctx.from) {
      scrollPositions.set(ctx.from.path, {
        x: window.scrollX,
        y: window.scrollY,
      });
    }

    await next();

    // Scroll to hash if present
    if (scrollToHash && ctx.to.hash) {
      const element = document.getElementById(ctx.to.hash);
      if (element) {
        element.scrollIntoView({ behavior });
        return;
      }
    }

    // Check for saved position (back/forward navigation)
    const savedPosition = scrollPositions.get(ctx.to.path);
    if (savedPosition) {
      window.scrollTo({
        left: savedPosition.x,
        top: savedPosition.y,
        behavior,
      });
    } else {
      // New navigation - scroll to top
      window.scrollTo({ top: 0, left: 0, behavior });
    }
  });
}

/**
 * Create a page title middleware
 */
export function createTitleMiddleware(
  options: {
    suffix?: string;
    separator?: string;
    defaultTitle?: string;
  } = {}
): RouteMiddleware {
  const {
    suffix = '',
    separator = ' | ',
    defaultTitle = 'Page',
  } = options;

  return defineMiddleware('title', async (ctx, next) => {
    await next();

    // Get title from route meta
    const lastMatch = ctx.matched[ctx.matched.length - 1];
    const meta = lastMatch?.route.meta ?? {};
    const pageTitle = (meta.title as string) ?? defaultTitle;

    // Build full title
    let fullTitle = pageTitle;
    if (suffix) {
      fullTitle += separator + suffix;
    }

    document.title = fullTitle;
  });
}

/* v8 ignore stop */

/**
 * Create an analytics middleware
 */
export function createAnalyticsMiddleware(
  trackFn: (event: string, data: Record<string, unknown>) => void
): RouteMiddleware {
  return defineMiddleware('analytics', async (ctx, next) => {
    await next();

    // Track page view after navigation completes
    trackFn('page_view', {
      path: ctx.to.path,
      query: ctx.to.query,
      from: ctx.from?.path,
    });
  });
}

/**
 * Create a loading indicator middleware
 */
export function createLoadingMiddleware(
  options: {
    onStart?: () => void;
    onEnd?: () => void;
    delay?: number;
  } = {}
): RouteMiddleware {
  const { onStart, onEnd, delay = 0 } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return defineMiddleware('loading', async (_ctx, next) => {
    // Clear any existing timeout
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Start loading after delay (to avoid flashing for fast navigations)
    if (delay > 0) {
      timeoutId = setTimeout(() => {
        onStart?.();
      }, delay);
    } else {
      onStart?.();
    }

    try {
      await next();
    } finally {
      // Cancel delayed start if navigation was fast
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      onEnd?.();
    }
  });
}
