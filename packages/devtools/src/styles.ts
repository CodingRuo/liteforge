/**
 * LiteForge DevTools Styles
 *
 * Inline styles for the DevTools panel.
 * Uses a dark theme similar to browser DevTools.
 */

// ============================================================================
// Color Palette
// ============================================================================

export const colors = {
  // Backgrounds
  bgPrimary: '#1e1e2e',
  bgSecondary: '#282839',
  bgTertiary: '#313244',
  bgHover: '#45475a',
  bgActive: '#585b70',

  // Text
  textPrimary: '#cdd6f4',
  textSecondary: '#a6adc8',
  textMuted: '#6c7086',

  // Accent colors
  accent: '#89b4fa',
  accentHover: '#b4befe',
  success: '#a6e3a1',
  warning: '#f9e2af',
  error: '#f38ba8',

  // Borders
  border: '#45475a',
  borderLight: '#585b70',

  // Code/values
  codeString: '#a6e3a1',
  codeNumber: '#fab387',
  codeBoolean: '#cba6f7',
  codeNull: '#f38ba8',
  codeKey: '#89dceb',
} as const;

// ============================================================================
// Common Styles
// ============================================================================

export const commonStyles = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '12px',
  lineHeight: '1.5',
} as const;

// ============================================================================
// Panel Styles
// ============================================================================

export function getPanelStyles(
  position: 'right' | 'bottom' | 'floating' | 'bottom-right',
  width: number,
  height: number,
  isOpen: boolean
): string {
  const base = `
    position: fixed;
    z-index: 99999;
    background: ${colors.bgPrimary};
    color: ${colors.textPrimary};
    font-family: ${commonStyles.fontFamily};
    font-size: ${commonStyles.fontSize};
    line-height: ${commonStyles.lineHeight};
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    transition: transform 0.2s ease-out;
  `;

  if (position === 'right') {
    return `
      ${base}
      top: 0;
      right: 0;
      width: ${width}px;
      height: 100vh;
      transform: translateX(${isOpen ? '0' : '100%'});
      border-left: 1px solid ${colors.border};
    `;
  }

  if (position === 'bottom') {
    return `
      ${base}
      bottom: 0;
      left: 0;
      right: 0;
      height: ${height}px;
      transform: translateY(${isOpen ? '0' : '100%'});
      border-top: 1px solid ${colors.border};
    `;
  }

  if (position === 'bottom-right') {
    return `
      ${base}
      bottom: 16px;
      right: 16px;
      width: ${width}px;
      height: ${height}px;
      transform: scale(${isOpen ? '1' : '0.9'}) translateY(${isOpen ? '0' : '20px'});
      transform-origin: bottom right;
      opacity: ${isOpen ? '1' : '0'};
      pointer-events: ${isOpen ? 'auto' : 'none'};
      border-radius: 8px;
      border: 1px solid ${colors.border};
    `;
  }

  // Floating
  return `
    ${base}
    top: 50%;
    left: 50%;
    width: ${width}px;
    height: 500px;
    transform: translate(-50%, -50%) ${isOpen ? 'scale(1)' : 'scale(0.9)'};
    opacity: ${isOpen ? '1' : '0'};
    pointer-events: ${isOpen ? 'auto' : 'none'};
    border-radius: 8px;
    border: 1px solid ${colors.border};
  `;
}

export const toggleTabStyles = `
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 80px;
  background: ${colors.bgSecondary};
  border: 1px solid ${colors.border};
  border-right: none;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99998;
  transition: background 0.15s ease;
`;

export const headerStyles = `
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${colors.bgSecondary};
  border-bottom: 1px solid ${colors.border};
  min-height: 40px;
`;

export const tabBarStyles = `
  display: flex;
  gap: 2px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
`;

export function getTabStyles(isActive: boolean): string {
  return `
    padding: 6px 12px;
    border: none;
    background: ${isActive ? colors.bgTertiary : 'transparent'};
    color: ${isActive ? colors.textPrimary : colors.textSecondary};
    cursor: pointer;
    font-family: ${commonStyles.fontFamily};
    font-size: ${commonStyles.fontSize};
    border-radius: 4px;
    transition: background 0.15s ease, color 0.15s ease;
  `;
}

export const controlsStyles = `
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const buttonStyles = `
  padding: 4px 8px;
  border: 1px solid ${colors.border};
  background: ${colors.bgTertiary};
  color: ${colors.textSecondary};
  cursor: pointer;
  font-family: ${commonStyles.fontFamily};
  font-size: 11px;
  border-radius: 4px;
  transition: background 0.15s ease, border-color 0.15s ease;
`;

export const contentStyles = `
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

export const scrollContainerStyles = `
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

// ============================================================================
// Event List Styles
// ============================================================================

export const eventListStyles = `
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

export function getEventItemStyles(type: string): string {
  let borderColor: string = colors.border;
  if (type.startsWith('signal:')) borderColor = colors.accent;
  if (type.startsWith('store:')) borderColor = colors.success;
  if (type.startsWith('nav:') || type.startsWith('guard:')) borderColor = colors.warning;
  if (type.startsWith('component:')) borderColor = colors.codeBoolean;

  return `
    padding: 6px 8px;
    background: ${colors.bgSecondary};
    border-left: 3px solid ${borderColor};
    border-radius: 2px;
    font-size: 11px;
  `;
}

export const eventTypeStyles = `
  color: ${colors.textMuted};
  font-size: 10px;
  text-transform: uppercase;
  margin-bottom: 2px;
`;

export const eventContentStyles = `
  display: flex;
  gap: 8px;
  align-items: baseline;
`;

export const eventLabelStyles = `
  color: ${colors.accent};
  font-weight: 500;
`;

export const eventValueStyles = `
  color: ${colors.textSecondary};
`;

export const eventTimestampStyles = `
  color: ${colors.textMuted};
  font-size: 10px;
  margin-left: auto;
`;

// ============================================================================
// Search/Filter Styles
// ============================================================================

export const searchBarStyles = `
  padding: 8px;
  border-bottom: 1px solid ${colors.border};
`;

export const searchInputStyles = `
  width: 100%;
  padding: 6px 10px;
  border: 1px solid ${colors.border};
  background: ${colors.bgTertiary};
  color: ${colors.textPrimary};
  font-family: ${commonStyles.fontFamily};
  font-size: ${commonStyles.fontSize};
  border-radius: 4px;
  outline: none;
`;

// ============================================================================
// Tree View Styles
// ============================================================================

export const treeNodeStyles = `
  padding: 4px 0;
`;

export const treeToggleStyles = `
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

export const treeKeyStyles = `
  color: ${colors.codeKey};
`;

export const treeValueStyles = `
  margin-left: 4px;
`;

// ============================================================================
// Resize Handle Styles
// ============================================================================

export const resizeHandleStyles = `
  position: absolute;
  background: transparent;
  transition: background 0.15s ease;
`;

export const resizeHandleVerticalStyles = `
  ${resizeHandleStyles}
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: ew-resize;
`;

export const resizeHandleHorizontalStyles = `
  ${resizeHandleStyles}
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  cursor: ns-resize;
`;

// ============================================================================
// Value Formatting Styles
// ============================================================================

export function getValueStyle(value: unknown): string {
  if (value === null) return `color: ${colors.codeNull}`;
  if (value === undefined) return `color: ${colors.codeNull}`;
  if (typeof value === 'string') return `color: ${colors.codeString}`;
  if (typeof value === 'number') return `color: ${colors.codeNumber}`;
  if (typeof value === 'boolean') return `color: ${colors.codeBoolean}`;
  return `color: ${colors.textSecondary}`;
}

// ============================================================================
// Time-Travel History Styles
// ============================================================================

/** Base styles for a history entry row */
export const historyEntryStyles = `
  padding: 4px 8px;
  border-radius: 2px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
  border-left: 3px solid transparent;
  position: relative;
`;

/** Hover state for history entries */
export const historyEntryHoverBg = colors.bgHover;

/** Active/restored state - gold left border */
export const historyEntryActiveBorder = colors.warning;

/** Restore label that appears on hover */
export const restoreLabelStyles = `
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: ${colors.warning};
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
`;

/** Current button styles */
export const currentButtonStyles = `
  padding: 4px 10px;
  border: 1px solid ${colors.warning};
  background: transparent;
  color: ${colors.warning};
  cursor: pointer;
  font-family: ${commonStyles.fontFamily};
  font-size: 11px;
  border-radius: 4px;
  transition: background 0.15s ease;
  margin-bottom: 8px;
`;

/** Flash animation keyframes (applied via JS) */
export const flashSuccessColor = colors.success;

/** Restored indicator styles */
export const restoredIndicatorStyles = `
  font-size: 10px;
  color: ${colors.warning};
  padding: 2px 6px;
  background: ${colors.bgTertiary};
  border-radius: 3px;
  margin-left: 8px;
`;
