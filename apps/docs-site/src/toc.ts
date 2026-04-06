/**
 * Shared TOC slot — pages call setToc() on mount; Layout reads tocEntries() reactively.
 */
import { signal } from 'liteforge';
import type { TocEntry } from './components/TableOfContents.js';

export const tocEntries = signal<TocEntry[]>([]);

export function setToc(entries: TocEntry[]): void {
  tocEntries.set(entries);
}

export function clearToc(): void {
  tocEntries.set([]);
}
