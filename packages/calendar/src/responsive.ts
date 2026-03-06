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
    // Set initial value synchronously
    _signal.set(classify(el.getBoundingClientRect().width))

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      _signal.set(classify(entry.contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }

  return { sizeClass: () => _signal(), observe }
}
