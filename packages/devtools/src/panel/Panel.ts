/**
 * LiteForge DevTools Panel
 *
 * Main panel container with header, tabs, and content area.
 * Built using LiteForge signals and direct DOM manipulation.
 */

import type { Signal } from '@liteforge/core';
import { effect } from '../internals.js';
import {
  getPanelStyles,
  headerStyles,
  tabBarStyles,
  getTabStyles,
  controlsStyles,
  buttonStyles,
  contentStyles,
} from '../styles.js';
import type {
  ResolvedDevToolsConfig,
  PanelState,
  TabId,
  EventBuffer,
} from '../types.js';
import type { DevToolsStoreMap } from '../types.js';
import { createSignalInspector } from '../tabs/SignalInspector.js';
import { createStoreExplorer } from '../tabs/StoreExplorer.js';
import { createRouterInspector } from '../tabs/RouterInspector.js';
import { createComponentTree } from '../tabs/ComponentTree.js';
import { createPerformanceTab } from '../tabs/Performance.js';

// ============================================================================
// Tab Configuration
// ============================================================================

interface TabConfig {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'signals', label: 'Signals', icon: 'S' },
  { id: 'stores', label: 'Stores', icon: 'St' },
  { id: 'router', label: 'Router', icon: 'R' },
  { id: 'components', label: 'Comps', icon: 'C' },
  { id: 'performance', label: 'Perf', icon: 'P' },
];

// ============================================================================
// Panel Creation
// ============================================================================

/**
 * Create the main DevTools panel element.
 */
export function createPanel(
  config: ResolvedDevToolsConfig,
  state: Signal<PanelState>,
  buffer: EventBuffer,
  stores: DevToolsStoreMap
): HTMLElement {
  // Create panel container
  const panel = document.createElement('div');
  panel.id = 'liteforge-devtools';
  panel.setAttribute('style', getPanelStyles(config.position, config.width, config.height, false));

  // Create header
  const header = createHeader(state, config);
  panel.appendChild(header);

  // Create content area
  const content = document.createElement('div');
  content.setAttribute('style', contentStyles);
  panel.appendChild(content);

  // Track tab content containers and their dispose functions
  const tabContents = new Map<TabId, HTMLElement>();
  const tabDisposers = new Map<TabId, () => void>();

  // Track last active tab for cleanup
  let lastActiveTab: TabId | null = null;

  // Create tab content lazily (only when first viewed)
  function ensureTabContent(tabId: TabId): void {
    if (tabContents.has(tabId)) return;

    const tabResult = createTabContent(tabId, buffer, state, stores);
    tabResult.element.style.display = 'none';
    content.appendChild(tabResult.element);
    tabContents.set(tabId, tabResult.element);
    tabDisposers.set(tabId, tabResult.dispose);
  }

  // Effect to switch tabs and update styles
  effect(() => {
    const currentState = state();

    // Update panel styles
    panel.setAttribute('style', getPanelStyles(
      config.position,
      currentState.width,
      currentState.height,
      currentState.isOpen
    ));

    const activeTab = currentState.activeTab;

    // Dispose previous tab's effects when switching away
    if (lastActiveTab !== null && lastActiveTab !== activeTab) {
      const disposer = tabDisposers.get(lastActiveTab);
      if (disposer) {
        disposer();
        // Remove the disposed tab so it will be recreated fresh next time
        const oldContent = tabContents.get(lastActiveTab);
        if (oldContent && oldContent.parentNode) {
          oldContent.parentNode.removeChild(oldContent);
        }
        tabContents.delete(lastActiveTab);
        tabDisposers.delete(lastActiveTab);
      }
    }

    // Ensure active tab content exists
    ensureTabContent(activeTab);

    // Show/hide tab contents
    for (const [tabId, tabContent] of tabContents) {
      tabContent.style.display = tabId === activeTab ? 'flex' : 'none';
    }

    lastActiveTab = activeTab;
  });

  return panel;
}

/**
 * Create the panel header with tabs and controls.
 */
function createHeader(
  state: Signal<PanelState>,
  config: ResolvedDevToolsConfig
): HTMLElement {
  const header = document.createElement('div');
  header.setAttribute('style', headerStyles);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.setAttribute('style', tabBarStyles);

  // Create tab buttons
  const tabButtons: HTMLButtonElement[] = [];
  for (const tab of TABS) {
    const button = document.createElement('button');
    button.textContent = tab.label;
    button.title = tab.label;
    button.onclick = () => {
      state.update(s => ({ ...s, activeTab: tab.id }));
    };
    tabBar.appendChild(button);
    tabButtons.push(button);
  }

  // Effect to update tab button styles
  effect(() => {
    const currentState = state();
    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i];
      const button = tabButtons[i];
      if (tab && button) {
        button.setAttribute('style', getTabStyles(currentState.activeTab === tab.id));
      }
    }
  });

  header.appendChild(tabBar);

  // Controls
  const controls = document.createElement('div');
  controls.setAttribute('style', controlsStyles);

  // Pause/Resume button
  const pauseButton = document.createElement('button');
  pauseButton.setAttribute('style', buttonStyles);
  pauseButton.onclick = () => {
    state.update(s => ({ ...s, isPaused: !s.isPaused }));
  };

  effect(() => {
    pauseButton.textContent = state().isPaused ? 'Resume' : 'Pause';
  });

  controls.appendChild(pauseButton);

  // Clear button
  const clearButton = document.createElement('button');
  clearButton.setAttribute('style', buttonStyles);
  clearButton.textContent = 'Clear';
  clearButton.onclick = () => {
    // Dispatch custom event for tabs to handle
    const event = new CustomEvent('devtools:clear');
    header.dispatchEvent(event);
  };
  controls.appendChild(clearButton);

  // Close button
  const closeButton = document.createElement('button');
  closeButton.setAttribute('style', buttonStyles);
  closeButton.textContent = 'X';
  closeButton.title = `Close (${config.shortcut})`;
  closeButton.onclick = () => {
    state.update(s => ({ ...s, isOpen: false }));
  };
  closeButton.style.padding = '4px 6px';
  closeButton.style.fontWeight = 'bold';
  controls.appendChild(closeButton);

  header.appendChild(controls);

  return header;
}

/**
 * Tab result with element and dispose function.
 */
interface TabResult {
  element: HTMLElement;
  dispose: () => void;
}

/**
 * Create content for a specific tab.
 * Returns the container element and a dispose function.
 */
function createTabContent(
  tabId: TabId,
  buffer: EventBuffer,
  state: Signal<PanelState>,
  stores: DevToolsStoreMap
): TabResult {
  const container = document.createElement('div');
  container.setAttribute('style', `${contentStyles} flex-direction: column;`);

  let tabResult: TabResult;

  switch (tabId) {
    case 'signals':
      tabResult = createSignalInspector(buffer, state);
      container.appendChild(tabResult.element);
      break;
    case 'stores':
      tabResult = createStoreExplorer(buffer, state, stores);
      container.appendChild(tabResult.element);
      break;
    case 'router':
      tabResult = createRouterInspector(buffer, state);
      container.appendChild(tabResult.element);
      break;
    case 'components':
      tabResult = createComponentTree(buffer, state);
      container.appendChild(tabResult.element);
      break;
    case 'performance':
      tabResult = createPerformanceTab(buffer, state);
      container.appendChild(tabResult.element);
      break;
    default:
      tabResult = { element: document.createElement('div'), dispose: () => {} };
  }

  return {
    element: container,
    dispose: tabResult.dispose,
  };
}
