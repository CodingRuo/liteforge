/**
 * LiteForge DevTools - Component Tree Tab
 *
 * Hierarchical view of mounted components.
 */

import type { Signal } from '@liteforge/core';
import { signal, effect } from '../internals.js';
import {
  scrollContainerStyles,
  colors,
} from '../styles.js';
import type { EventBuffer, PanelState, ComponentInfo } from '../types.js';

// ============================================================================
// Component Tree
// ============================================================================

/**
 * Tab result with cleanup function
 */
export interface TabResult {
  element: HTMLElement;
  dispose: () => void;
}

/**
 * Create the Component Tree tab content.
 */
export function defineComponentTree(
  buffer: EventBuffer,
  state: Signal<PanelState>
): TabResult {
  // Track all cleanup functions
  const cleanups: Array<() => void> = [];

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.height = '100%';

  // Tree container
  const treeContainer = document.createElement('div');
  treeContainer.setAttribute('style', scrollContainerStyles);
  treeContainer.style.flex = '1';
  container.appendChild(treeContainer);

  // Track components
  const components = signal<Map<string, ComponentInfo>>(new Map());

  // Subscribe to component events
  const unsubscribe = buffer.subscribe((storedEvent) => {
    if (state().isPaused) return;

    const event = storedEvent.event;

    // Use switch for proper type narrowing
    switch (event.type) {
      case 'component:mount':
        components.update(map => {
          const newMap = new Map(map);
          newMap.set(event.payload.id, {
            id: event.payload.id,
            name: event.payload.name,
            parent: event.payload.parent,
            mountTime: event.payload.timestamp,
            unmountTime: undefined,
            isActive: true,
          });
          return newMap;
        });
        break;

      case 'component:unmount':
        components.update(map => {
          const newMap = new Map(map);
          const comp = newMap.get(event.payload.id);
          if (comp) {
            comp.unmountTime = event.payload.timestamp;
            comp.isActive = false;
            // Remove after a delay
            const idToRemove = event.payload.id;
            setTimeout(() => {
              components.update(m => {
                const updated = new Map(m);
                updated.delete(idToRemove);
                return updated;
              });
            }, 2000);
          }
          return newMap;
        });
        break;
    }
  });
  cleanups.push(unsubscribe);

  // Effect to render tree
  const stopEffect = effect(() => {
    const compMap = components();

    treeContainer.innerHTML = '';

    if (compMap.size === 0) {
      const empty = document.createElement('div');
      empty.style.color = colors.textMuted;
      empty.style.textAlign = 'center';
      empty.style.padding = '20px';
      empty.textContent = 'No components mounted yet.';
      treeContainer.appendChild(empty);
      return;
    }

    // Build tree structure
    const rootComponents: ComponentInfo[] = [];
    const childrenMap = new Map<string, ComponentInfo[]>();

    for (const comp of compMap.values()) {
      if (!comp.parent) {
        rootComponents.push(comp);
      } else {
        const children = childrenMap.get(comp.parent) ?? [];
        children.push(comp);
        childrenMap.set(comp.parent, children);
      }
    }

    // Render tree
    for (const root of rootComponents) {
      const node = createTreeNode(root, childrenMap, 0);
      treeContainer.appendChild(node);
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
 * Create a tree node for a component.
 */
function createTreeNode(
  comp: ComponentInfo,
  childrenMap: Map<string, ComponentInfo[]>,
  depth: number
): HTMLElement {
  const node = document.createElement('div');
  node.style.paddingLeft = `${depth * 16}px`;

  // Component header
  const header = document.createElement('div');
  header.style.padding = '4px 8px';
  header.style.borderRadius = '2px';
  header.style.marginBottom = '2px';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';
  header.style.cursor = 'pointer';
  header.style.transition = 'background 0.15s ease';

  if (!comp.isActive) {
    header.style.opacity = '0.5';
    header.style.textDecoration = 'line-through';
  }

  // Expand icon
  const children = childrenMap.get(comp.id) ?? [];
  const hasChildren = children.length > 0;

  const expandIcon = document.createElement('span');
  expandIcon.textContent = hasChildren ? 'v' : ' ';
  expandIcon.style.color = colors.textMuted;
  expandIcon.style.width = '10px';
  header.appendChild(expandIcon);

  // Component name
  const nameEl = document.createElement('span');
  nameEl.textContent = comp.name;
  nameEl.style.color = comp.isActive ? colors.accent : colors.textMuted;
  nameEl.style.fontWeight = '500';
  header.appendChild(nameEl);

  // Mount time
  const timeEl = document.createElement('span');
  timeEl.textContent = formatDuration(comp.mountTime);
  timeEl.style.color = colors.textMuted;
  timeEl.style.fontSize = '10px';
  timeEl.style.marginLeft = 'auto';
  header.appendChild(timeEl);

  node.appendChild(header);

  // Children container
  if (hasChildren) {
    const childrenContainer = document.createElement('div');
    
    for (const child of children) {
      const childNode = createTreeNode(child, childrenMap, depth + 1);
      childrenContainer.appendChild(childNode);
    }

    node.appendChild(childrenContainer);

    // Toggle children
    let isExpanded = true;
    header.onclick = () => {
      isExpanded = !isExpanded;
      childrenContainer.style.display = isExpanded ? 'block' : 'none';
      expandIcon.textContent = isExpanded ? 'v' : '>';
    };
  }

  // Hover effect
  header.onmouseenter = () => {
    header.style.background = colors.bgHover;
  };
  header.onmouseleave = () => {
    header.style.background = 'transparent';
  };

  return node;
}

/**
 * Format mount duration.
 */
function formatDuration(timestamp: number): string {
  const now = performance.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return `${Math.round(diff)}ms ago`;
  if (diff < 60000) return `${Math.round(diff / 1000)}s ago`;
  return `${Math.round(diff / 60000)}m ago`;
}
