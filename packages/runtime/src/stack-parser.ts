/**
 * Stack Trace Parser
 *
 * Parses V8 and Firefox stack traces into structured frames.
 * Used by the default error page to render human-readable stack traces.
 */

// ============================================================================
// Types
// ============================================================================

export interface StackFrame {
  /** Function/method name, or '<anonymous>' */
  fn: string;
  /** Source file path or URL */
  file: string;
  /** 1-based line number */
  line: number;
  /** 1-based column number */
  col: number;
  /** True if the frame is from LiteForge internals or node_modules */
  isInternal: boolean;
}

// ============================================================================
// Internals
// ============================================================================

// Matches V8: "    at FunctionName (file:line:col)"
//  or:         "    at file:line:col"         (anonymous)
//  or:         "    at new FunctionName (file:line:col)"
const V8_FRAME = /^\s*at (?:new )?(?:(.+?) \()?(.+):(\d+):(\d+)\)?$/;

// Matches Firefox/Safari: "functionName@file:line:col"
const FF_FRAME = /^(.*)@(.+):(\d+):(\d+)$/;

function isInternalFile(file: string): boolean {
  return (
    file.includes('node_modules/liteforge') ||
    file.includes('node_modules/@liteforge') ||
    file.includes('/liteforge/dist/') ||
    file.includes('/liteforge/src/')
  );
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse a stack trace string into structured frames.
 * Handles V8 (Node/Chrome) and Firefox/Safari formats.
 * Returns an empty array for null/undefined/empty input.
 */
export function parseStack(stack: string | null | undefined): StackFrame[] {
  if (!stack) return [];

  const lines = stack.split('\n');
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try V8 format first
    const v8 = V8_FRAME.exec(trimmed);
    if (v8) {
      const fn = v8[1] ?? '<anonymous>';
      const file = (v8[2] ?? '').replace(/\?t=\d+$/, '');
      const lineNum = parseInt(v8[3] ?? '0', 10);
      const col = parseInt(v8[4] ?? '0', 10);
      frames.push({ fn, file, line: lineNum, col, isInternal: isInternalFile(file) });
      continue;
    }

    // Try Firefox/Safari format
    const ff = FF_FRAME.exec(trimmed);
    if (ff) {
      const fn = ff[1] ? ff[1] : '<anonymous>';
      const file = (ff[2] ?? '').replace(/\?t=\d+$/, '');
      const lineNum = parseInt(ff[3] ?? '0', 10);
      const col = parseInt(ff[4] ?? '0', 10);
      frames.push({ fn, file, line: lineNum, col, isInternal: isInternalFile(file) });
    }
    // Lines that match neither format (e.g. "Error: message") are skipped
  }

  return frames;
}
