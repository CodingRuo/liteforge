import { signal } from '@liteforge/core'
import type { CalendarSizeClass, ResponsiveConfig } from './types.js'

export interface ResponsiveController {
  sizeClass: () => CalendarSizeClass
  observe: (el: HTMLElement) => () => void
}

export function createResponsiveController(config: ResponsiveConfig): ResponsiveController {
  const mobileBp = config.mobileBp ?? 768
  const tabletBp = config.tabletBp ?? 1024

  const _signal = signal<CalendarSizeClass>('desktop')

  function classify(width: number): CalendarSizeClass {
    if (width < mobileBp) return 'mobile'
    if (width < tabletBp) return 'tablet'
    return 'desktop'
  }

  function observe(el: HTMLElement): () => void {
    // Use window width, not element width.
    // Observing the calendar container itself creates a feedback loop: hiding
    // the sidebar changes the container width, which re-triggers the observer,
    // which shows/hides the sidebar again — infinite oscillation.
    const getWidth = () => (typeof window !== 'undefined' ? window.innerWidth : el.getBoundingClientRect().width)

    _signal.set(classify(getWidth()))

    if (typeof window === 'undefined') return () => {}

    const onResize = () => {
      const next = classify(getWidth())
      if (next !== _signal()) _signal.set(next)
    }

    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }

  return { sizeClass: () => _signal(), observe }
}
