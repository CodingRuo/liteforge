/**
 * LiteForge DevTools - Router Inspector Tab
 *
 * Navigation history and guard execution details.
 */

import type { Signal } from '@liteforge/core';
import { signal, effect } from '../internals.js';
import {
  scrollContainerStyles,
  eventListStyles,
  getEventItemStyles,
  colors,
} from '../styles.js';
import type { EventBuffer, PanelState, NavigationInfo } from '../types.js';

// ============================================================================
// Router Inspector
// ============================================================================

/**
 * Tab result with cleanup function
 */
export interface TabResult {
  element: HTMLElement;
  dispose: () => void;
}

/**
 * Create the Router Inspector tab content.
 */
export function defineRouterInspector(
  buffer: EventBuffer,
  state: Signal<PanelState>
): TabResult {
  // Track all cleanup functions
  const cleanups: Array<() => void> = [];

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  // Current route section
  const currentRouteSection = document.createElement('div');
  currentRouteSection.style.padding = '12px';
  currentRouteSection.style.borderBottom = `1px solid ${colors.border}`;
  container.appendChild(currentRouteSection);

  const currentLabel = document.createElement('div');
  currentLabel.textContent = 'Current Path:';
  currentLabel.style.color = colors.textMuted;
  currentLabel.style.fontSize = '10px';
  currentLabel.style.marginBottom = '4px';
  currentRouteSection.appendChild(currentLabel);

  const currentPath = document.createElement('div');
  currentPath.style.color = colors.accent;
  currentPath.style.fontWeight = '500';
  currentPath.textContent = '/';
  currentRouteSection.appendChild(currentPath);

  // Navigation history section
  const historySection = document.createElement('div');
  historySection.setAttribute('style', scrollContainerStyles);
  historySection.style.flex = '1';
  container.appendChild(historySection);

  // Track navigations
  const navigations = signal<NavigationInfo[]>([]);

  // Subscribe to navigation events
  const unsubscribe = buffer.subscribe((storedEvent) => {
    if (state().isPaused) return;

    const event = storedEvent.event;

    // Use switch for proper type narrowing
    switch (event.type) {
      case 'nav:end':
        // Update current path
        currentPath.textContent = event.payload.to;

        // Add to history
        navigations.update(list => [
          ...list.slice(-49), // Keep last 50
          {
            timestamp: event.payload.timestamp,
            from: event.payload.from,
            to: event.payload.to,
            duration: event.payload.duration,
            guardResults: event.payload.guardResults,
          },
        ]);
        break;
    }
  });
  cleanups.push(unsubscribe);

  // Effect to render history
  const stopEffect = effect(() => {
    const navList = navigations();

    historySection.innerHTML = '';

    if (navList.length === 0) {
      const empty = document.createElement('div');
      empty.style.color = colors.textMuted;
      empty.style.textAlign = 'center';
      empty.style.padding = '20px';
      empty.textContent = 'No navigations yet.';
      historySection.appendChild(empty);
      return;
    }

    const historyLabel = document.createElement('div');
    historyLabel.textContent = 'Navigation History:';
    historyLabel.style.color = colors.textMuted;
    historyLabel.style.fontSize = '10px';
    historyLabel.style.marginBottom = '8px';
    historySection.appendChild(historyLabel);

    const list = document.createElement('div');
    list.setAttribute('style', eventListStyles);

    // Show newest first
    for (const nav of [...navList].reverse()) {
      const item = createNavigationItem(nav);
      list.appendChild(item);
    }

    historySection.appendChild(list);
  });
  cleanups.push(stopEffect);

  return {
    element: container,
    dispose: () => {
      for (const fn of cleanups) fn();
    },
  };
}

/**
 * Create a navigation history item.
 */
function createNavigationItem(nav: NavigationInfo): HTMLElement {
  const item = document.createElement('div');
  item.setAttribute('style', getEventItemStyles('nav:end'));
  item.style.cursor = 'pointer';

  // Route change
  const routeEl = document.createElement('div');
  routeEl.style.display = 'flex';
  routeEl.style.alignItems = 'center';
  routeEl.style.gap = '8px';
  routeEl.style.marginBottom = '4px';

  const fromEl = document.createElement('span');
  fromEl.textContent = nav.from || '/';
  fromEl.style.color = colors.textSecondary;
  routeEl.appendChild(fromEl);

  const arrowEl = document.createElement('span');
  arrowEl.textContent = '->';
  arrowEl.style.color = colors.textMuted;
  routeEl.appendChild(arrowEl);

  const toEl = document.createElement('span');
  toEl.textContent = nav.to;
  toEl.style.color = colors.accent;
  toEl.style.fontWeight = '500';
  routeEl.appendChild(toEl);

  item.appendChild(routeEl);

  // Details
  const detailsEl = document.createElement('div');
  detailsEl.style.display = 'flex';
  detailsEl.style.gap = '12px';
  detailsEl.style.fontSize = '10px';
  detailsEl.style.color = colors.textMuted;

  // Duration
  const durationEl = document.createElement('span');
  durationEl.textContent = `${nav.duration.toFixed(1)}ms`;
  detailsEl.appendChild(durationEl);

  // Guard results
  if (nav.guardResults.length > 0) {
    const guardsEl = document.createElement('span');
    const passed = nav.guardResults.filter(g => g.allowed).length;
    const total = nav.guardResults.length;
    guardsEl.textContent = `Guards: ${passed}/${total}`;
    guardsEl.style.color = passed === total ? colors.success : colors.warning;
    detailsEl.appendChild(guardsEl);
  }

  // Timestamp
  const timeEl = document.createElement('span');
  timeEl.textContent = formatTimestamp(nav.timestamp);
  timeEl.style.marginLeft = 'auto';
  detailsEl.appendChild(timeEl);

  item.appendChild(detailsEl);

  return item;
}

/**
 * Format a timestamp for display.
 */
function formatTimestamp(ms: number): string {
  const date = new Date(performance.timeOrigin + ms);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
