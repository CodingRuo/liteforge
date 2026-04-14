/**
 * LiteForge DevTools - Store Explorer Tab
 *
 * Tree view of registered stores with state, getters, action history,
 * and time-travel debugging via clickable history entries.
 */

import type { Signal } from '@liteforge/core';
import { signal, effect } from '../internals.js';
import {
  scrollContainerStyles,
  treeKeyStyles,
  getValueStyle,
  colors,
  historyEntryStyles,
  historyEntryHoverBg,
  historyEntryActiveBorder,
  restoreLabelStyles,
  currentButtonStyles,
  flashSuccessColor,
  restoredIndicatorStyles,
} from '../styles.js';
import type { EventBuffer, PanelState, StoreInfo, StoredEvent, StoreHistoryEntry } from '../types.js';
import type { DevToolsStoreMap, DevToolsStore } from '../types.js';

// ============================================================================
// Store Explorer
// ============================================================================

/**
 * Tab result with cleanup function
 */
export interface TabResult {
  element: HTMLElement;
  dispose: () => void;
}

/**
 * Track which history entry is currently "active" (restored to)
 * Key: storeName, Value: timestamp of active entry (or null for current)
 */
interface RestoreState {
  storeName: string;
  timestamp: number | null; // null means "current" (latest state)
}

/**
 * Create the Store Explorer tab content with time-travel support.
 */
export function createStoreExplorer(
  buffer: EventBuffer,
  state: Signal<PanelState>,
  stores: DevToolsStoreMap
): TabResult {
  // Track all cleanup functions
  const cleanups: Array<() => void> = [];

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  // Stores section
  const storesSection = document.createElement('div');
  storesSection.setAttribute('style', scrollContainerStyles);
  storesSection.style.flex = '1';
  container.appendChild(storesSection);

  // Track stores and their history
  const storesSignal = signal<Map<string, StoreInfo>>(new Map());
  
  // Track which entry is currently restored (for highlighting)
  const restoreState = signal<RestoreState | null>(null);
  
  // Track the "real" current state before time-travel began (per store)
  // This is saved on the FIRST restore action and cleared when "Current" is clicked
  const preTimeTravelSnapshots = new Map<string, Record<string, unknown>>();

  // Process a store event
  function processEvent(storedEvent: StoredEvent): void {
    const event = storedEvent.event;

    // Use switch for proper type narrowing
    switch (event.type) {
      case 'store:create':
        storesSignal.update(map => {
          const newMap = new Map(map);
          newMap.set(event.payload.id, {
            name: event.payload.id,
            state: event.payload.initialState,
            getters: {},
            actions: [],
            history: [],
          });
          return newMap;
        });
        break;

      case 'store:stateChange': {
        const storeId = event.payload.storeId;
        
        storesSignal.update(map => {
          const newMap = new Map(map);
          const storeInfo = newMap.get(storeId);
          if (storeInfo) {
            // Capture snapshot BEFORE updating - this is the state we want to restore to
            // When user clicks "Restore" on "currentUser: null → {...}", 
            // they want to go back to when currentUser was still null
            const snapshotBeforeChange = { ...storeInfo.state };
            
            // Update state with new value
            storeInfo.state = { ...storeInfo.state, [event.payload.key]: event.payload.newValue };
            
            // Add to history with snapshot from BEFORE the change
            const historyEntry: StoreHistoryEntry = {
              timestamp: event.payload.timestamp,
              key: event.payload.key,
              oldValue: event.payload.oldValue,
              newValue: event.payload.newValue,
              snapshot: snapshotBeforeChange,
            };
            storeInfo.history = [
              ...storeInfo.history.slice(-99), // Keep last 100
              historyEntry,
            ];
            newMap.set(storeId, storeInfo);
          }
          return newMap;
        });
        break;
      }

      case 'store:action':
        storesSignal.update(map => {
          const newMap = new Map(map);
          const storeInfo = newMap.get(event.payload.storeId);
          if (storeInfo) {
            storeInfo.actions = [...new Set([...storeInfo.actions, event.payload.action])];
            newMap.set(event.payload.storeId, storeInfo);
          }
          return newMap;
        });
        break;
    }
  }

  // Restore a store to a specific snapshot
  function restoreToSnapshot(
    storeName: string, 
    snapshot: Record<string, unknown>,
    timestamp: number | null,
    storeCard: HTMLElement
  ): void {
    const store = stores[storeName];
    if (!store) return;

    // On FIRST time-travel for this store, save the current "real" state
    // so we can restore to it when user clicks "↻ Current"
    if (!preTimeTravelSnapshots.has(storeName)) {
      preTimeTravelSnapshots.set(storeName, store.$snapshot());
    }

    // Call $restore on the actual store
    store.$restore(snapshot);

    // Update restore state for highlighting
    restoreState.set({ storeName, timestamp });

    // Flash the store card green
    flashElement(storeCard);

    // Update the displayed state in our signal
    storesSignal.update(map => {
      const newMap = new Map(map);
      const storeInfo = newMap.get(storeName);
      if (storeInfo) {
        storeInfo.state = { ...snapshot };
        newMap.set(storeName, storeInfo);
      }
      return newMap;
    });
  }

  // Flash an element with a success color
  function flashElement(el: HTMLElement): void {
    const originalBg = el.style.background;
    el.style.background = flashSuccessColor;
    el.style.transition = 'background 0.3s ease';
    setTimeout(() => {
      el.style.background = originalBg;
    }, 300);
  }

  // Load existing store events from buffer
  const existingEvents = buffer.getAll();
  for (const storedEvent of existingEvents) {
    if (storedEvent.event.type.startsWith('store:')) {
      processEvent(storedEvent);
    }
  }

  // Subscribe to new store events
  const unsubscribe = buffer.subscribe((storedEvent) => {
    if (state().isPaused) return;
    if (!storedEvent.event.type.startsWith('store:')) return;
    processEvent(storedEvent);
  });
  cleanups.push(unsubscribe);

  // Effect to render stores
  const stopEffect = effect(() => {
    const storeMap = storesSignal();
    const currentRestoreState = restoreState();

    storesSection.innerHTML = '';

    if (storeMap.size === 0) {
      const empty = document.createElement('div');
      empty.style.color = colors.textMuted;
      empty.style.textAlign = 'center';
      empty.style.padding = '20px';
      empty.textContent = 'No stores registered yet.';
      storesSection.appendChild(empty);
      return;
    }

    for (const [name, storeInfo] of storeMap) {
      const store = stores[name];
      const storeEl = createStoreElement(
        name, 
        storeInfo, 
        store,
        currentRestoreState,
        (snapshot, timestamp, cardEl) => restoreToSnapshot(name, snapshot, timestamp, cardEl),
        (cardEl) => {
          // "Current" button clicked - restore to the state before time-travel began
          const originalSnapshot = preTimeTravelSnapshots.get(name);
          if (store && originalSnapshot) {
            // Restore the actual store
            store.$restore(originalSnapshot);
            
            // Clear the pre-time-travel snapshot (time-travel session ended)
            preTimeTravelSnapshots.delete(name);
            
            // Clear restore state (no longer in time-travel mode)
            restoreState.set(null);
            
            // Flash the card
            flashElement(cardEl);
            
            // Update displayed state
            storesSignal.update(map => {
              const newMap = new Map(map);
              const info = newMap.get(name);
              if (info) {
                info.state = { ...originalSnapshot };
                newMap.set(name, info);
              }
              return newMap;
            });
          }
        }
      );
      storesSection.appendChild(storeEl);
    }
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
 * Create a store element with expandable state tree and time-travel history.
 */
function createStoreElement(
  name: string, 
  storeInfo: StoreInfo,
  store: DevToolsStore | undefined,
  restoreState: RestoreState | null,
  onRestore: (snapshot: Record<string, unknown>, timestamp: number, cardEl: HTMLElement) => void,
  onRestoreCurrent: (cardEl: HTMLElement) => void
): HTMLElement {
  const container = document.createElement('div');
  container.style.marginBottom = '12px';
  container.style.background = colors.bgSecondary;
  container.style.borderRadius = '4px';
  container.style.overflow = 'hidden';

  // Header
  const header = document.createElement('div');
  header.style.padding = '8px 12px';
  header.style.background = colors.bgTertiary;
  header.style.fontWeight = '500';
  header.style.cursor = 'pointer';
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  
  const headerLeft = document.createElement('div');
  headerLeft.style.display = 'flex';
  headerLeft.style.alignItems = 'center';
  
  const nameEl = document.createElement('span');
  nameEl.textContent = name;
  nameEl.style.color = colors.accent;
  headerLeft.appendChild(nameEl);

  // Show "Restored" indicator if this store is in time-travel mode
  if (restoreState && restoreState.storeName === name && restoreState.timestamp !== null) {
    const restoredBadge = document.createElement('span');
    restoredBadge.setAttribute('style', restoredIndicatorStyles);
    const time = new Date(restoreState.timestamp).toLocaleTimeString();
    restoredBadge.textContent = `Restored to ${time}`;
    headerLeft.appendChild(restoredBadge);
  }

  header.appendChild(headerLeft);

  const toggleEl = document.createElement('span');
  toggleEl.textContent = 'v';
  toggleEl.style.color = colors.textMuted;
  header.appendChild(toggleEl);

  container.appendChild(header);

  // Content (state tree)
  const content = document.createElement('div');
  content.style.padding = '8px 12px';
  content.style.display = 'block';

  // State section
  const stateHeader = document.createElement('div');
  stateHeader.textContent = 'State:';
  stateHeader.style.color = colors.textMuted;
  stateHeader.style.fontSize = '10px';
  stateHeader.style.marginBottom = '4px';
  content.appendChild(stateHeader);

  const stateTree = createObjectTree(storeInfo.state);
  content.appendChild(stateTree);

  // History section with time-travel
  if (storeInfo.history.length > 0 && store) {
    const historyHeader = document.createElement('div');
    historyHeader.style.display = 'flex';
    historyHeader.style.justifyContent = 'space-between';
    historyHeader.style.alignItems = 'center';
    historyHeader.style.marginTop = '12px';
    historyHeader.style.marginBottom = '8px';
    
    const historyLabel = document.createElement('span');
    historyLabel.textContent = `History (${storeInfo.history.length}):`;
    historyLabel.style.color = colors.textMuted;
    historyLabel.style.fontSize = '10px';
    historyHeader.appendChild(historyLabel);

    // "Current" button - only show if we're in time-travel mode
    if (restoreState && restoreState.storeName === name && restoreState.timestamp !== null) {
      const currentBtn = document.createElement('button');
      currentBtn.setAttribute('style', currentButtonStyles);
      currentBtn.textContent = '\u21bb Current';
      currentBtn.onclick = (e) => {
        e.stopPropagation();
        onRestoreCurrent(container);
      };
      currentBtn.onmouseenter = () => {
        currentBtn.style.background = colors.bgHover;
      };
      currentBtn.onmouseleave = () => {
        currentBtn.style.background = 'transparent';
      };
      historyHeader.appendChild(currentBtn);
    }

    content.appendChild(historyHeader);

    const historyList = document.createElement('div');
    historyList.style.display = 'flex';
    historyList.style.flexDirection = 'column';
    historyList.style.gap = '2px';

    // Show last 10 history entries (reversed so newest is at top)
    const entriesToShow = storeInfo.history.slice(-10).reverse();
    
    for (const entry of entriesToShow) {
      const entryEl = createHistoryEntry(
        entry,
        restoreState?.storeName === name && restoreState.timestamp === entry.timestamp,
        () => onRestore(entry.snapshot, entry.timestamp, container)
      );
      historyList.appendChild(entryEl);
    }
    content.appendChild(historyList);
  }

  container.appendChild(content);

  // Toggle visibility
  let isExpanded = true;
  header.onclick = () => {
    isExpanded = !isExpanded;
    content.style.display = isExpanded ? 'block' : 'none';
    toggleEl.textContent = isExpanded ? 'v' : '>';
  };

  return container;
}

/**
 * Create a clickable history entry with hover effects and restore functionality.
 */
function createHistoryEntry(
  entry: StoreHistoryEntry,
  isActive: boolean,
  onRestore: () => void
): HTMLElement {
  const entryEl = document.createElement('div');
  entryEl.setAttribute('style', historyEntryStyles);
  entryEl.style.fontSize = '11px';
  
  // Apply active state (gold left border)
  if (isActive) {
    entryEl.style.borderLeftColor = historyEntryActiveBorder;
    entryEl.style.background = colors.bgTertiary;
  }

  // Content wrapper
  const contentWrapper = document.createElement('div');
  contentWrapper.style.display = 'flex';
  contentWrapper.style.alignItems = 'baseline';
  contentWrapper.style.gap = '4px';
  contentWrapper.style.paddingRight = '60px'; // Space for restore label

  // Timestamp
  const timeEl = document.createElement('span');
  timeEl.style.color = colors.textMuted;
  timeEl.style.fontSize = '9px';
  timeEl.style.flexShrink = '0';
  const date = new Date(entry.timestamp);
  timeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  contentWrapper.appendChild(timeEl);

  // Key
  const keyEl = document.createElement('span');
  keyEl.setAttribute('style', treeKeyStyles);
  keyEl.textContent = entry.key + ':';
  contentWrapper.appendChild(keyEl);

  // Old value
  const oldValueEl = document.createElement('span');
  oldValueEl.setAttribute('style', getValueStyle(entry.oldValue));
  oldValueEl.textContent = formatValue(entry.oldValue);
  contentWrapper.appendChild(oldValueEl);

  // Arrow
  const arrowEl = document.createElement('span');
  arrowEl.style.color = colors.textMuted;
  arrowEl.textContent = '\u2192';
  contentWrapper.appendChild(arrowEl);

  // New value
  const newValueEl = document.createElement('span');
  newValueEl.setAttribute('style', getValueStyle(entry.newValue));
  newValueEl.textContent = formatValue(entry.newValue);
  contentWrapper.appendChild(newValueEl);

  entryEl.appendChild(contentWrapper);

  // Restore label (hidden by default, shown on hover)
  const restoreLabel = document.createElement('span');
  restoreLabel.setAttribute('style', restoreLabelStyles);
  restoreLabel.textContent = '\u23ea Restore';
  entryEl.appendChild(restoreLabel);

  // Hover effects
  entryEl.onmouseenter = () => {
    if (!isActive) {
      entryEl.style.background = historyEntryHoverBg;
    }
    restoreLabel.style.opacity = '1';
  };

  entryEl.onmouseleave = () => {
    if (!isActive) {
      entryEl.style.background = 'transparent';
    } else {
      entryEl.style.background = colors.bgTertiary;
    }
    restoreLabel.style.opacity = '0';
  };

  // Click to restore
  entryEl.onclick = () => {
    onRestore();
  };

  return entryEl;
}

/**
 * Create a simple object tree view.
 */
function createObjectTree(obj: Record<string, unknown>, depth = 0): HTMLElement {
  const container = document.createElement('div');
  container.style.paddingLeft = depth > 0 ? '12px' : '0';

  for (const [key, value] of Object.entries(obj)) {
    const row = document.createElement('div');
    row.style.fontSize = '11px';
    row.style.padding = '2px 0';

    const keyEl = document.createElement('span');
    keyEl.setAttribute('style', treeKeyStyles);
    keyEl.textContent = key + ': ';
    row.appendChild(keyEl);

    if (isPlainObject(value)) {
      // Nested object
      const toggleEl = document.createElement('span');
      toggleEl.textContent = '{...}';
      toggleEl.style.color = colors.textMuted;
      toggleEl.style.cursor = 'pointer';
      row.appendChild(toggleEl);

      const nested = createObjectTree(value, depth + 1);
      nested.style.display = 'none';
      row.appendChild(nested);

      toggleEl.onclick = () => {
        const isVisible = nested.style.display !== 'none';
        nested.style.display = isVisible ? 'none' : 'block';
        toggleEl.textContent = isVisible ? '{...}' : '{';
      };
    } else {
      const valueEl = document.createElement('span');
      valueEl.setAttribute('style', getValueStyle(value));
      valueEl.textContent = formatValue(value);
      row.appendChild(valueEl);
    }

    container.appendChild(row);
  }

  return container;
}

/**
 * Type guard for plain objects.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Format a value for display.
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value.slice(0, 30)}${value.length > 30 ? '...' : ''}"`;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}
