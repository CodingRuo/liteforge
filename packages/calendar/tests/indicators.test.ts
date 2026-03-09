import { describe, it, expect, vi } from 'vitest'
import { renderIndicators } from '../src/views/shared.js'
import type { CalendarEvent, EventIndicator } from '../src/types.js'
import type { EventTooltipConfig } from '../src/views/shared.js'

function makeEvent(indicators?: EventIndicator[]): CalendarEvent {
  const start = new Date('2024-01-15T10:00:00')
  const end = new Date('2024-01-15T11:00:00')
  return { id: 'e1', title: 'Test Event', start, end, indicators }
}

function makeContainer(): HTMLDivElement {
  return document.createElement('div')
}

describe('renderIndicators', () => {
  it('does nothing when indicators is undefined', () => {
    const container = makeContainer()
    renderIndicators(makeEvent(undefined), container)
    expect(container.querySelector('.lf-cal-event-indicators')).toBeNull()
  })

  it('does nothing when indicators is empty array', () => {
    const container = makeContainer()
    renderIndicators(makeEvent([]), container)
    expect(container.querySelector('.lf-cal-event-indicators')).toBeNull()
  })

  it('renders wrapper when indicators present', () => {
    const container = makeContainer()
    renderIndicators(makeEvent([{ icon: '⚠' }]), container)
    expect(container.querySelector('.lf-cal-event-indicators')).not.toBeNull()
  })

  it('renders single indicator with string icon via innerHTML', () => {
    const container = makeContainer()
    renderIndicators(makeEvent([{ icon: '⚠' }]), container)
    const items = container.querySelectorAll('.lf-cal-event-indicator')
    expect(items.length).toBe(1)
    expect((items[0] as HTMLElement).innerHTML).toBe('⚠')
  })

  it('renders single indicator with Node icon via appendChild', () => {
    const container = makeContainer()
    const node = document.createElement('span')
    node.textContent = 'X'
    renderIndicators(makeEvent([{ icon: node }]), container)
    const items = container.querySelectorAll('.lf-cal-event-indicator')
    expect(items.length).toBe(1)
    expect((items[0] as HTMLElement).querySelector('span')).not.toBeNull()
  })

  it('applies color to style.color and style.borderColor', () => {
    const container = makeContainer()
    renderIndicators(makeEvent([{ icon: '!', color: '#f97316' }]), container)
    const item = container.querySelector<HTMLElement>('.lf-cal-event-indicator')!
    expect(item.style.color).toBeTruthy()
    expect(item.style.borderColor).toBeTruthy()
  })

  it('renders correct count for multiple indicators', () => {
    const container = makeContainer()
    renderIndicators(makeEvent([
      { icon: '⚠' },
      { icon: '★' },
      { icon: '●' },
    ]), container)
    const items = container.querySelectorAll('.lf-cal-event-indicator')
    expect(items.length).toBe(3)
  })

  it('does not attach tooltip when no eventTooltip config', () => {
    const container = makeContainer()
    // Should not throw even though indicator has a tooltip string
    expect(() => {
      renderIndicators(makeEvent([{ icon: '⚠', tooltip: 'Warning' }]), container)
    }).not.toThrow()
  })

  it('calls eventTooltip.fn when indicator has tooltip text', () => {
    const container = makeContainer()
    const fn = vi.fn(() => () => {})
    const tooltipConfig: EventTooltipConfig<CalendarEvent> = { fn }
    renderIndicators(makeEvent([{ icon: '⚠', tooltip: 'Some warning' }]), container, tooltipConfig)
    expect(fn).toHaveBeenCalledOnce()
    const [, input] = fn.mock.calls[0] as [HTMLElement, { content: string; delay: number; position: string }]
    expect(input.content).toBe('Some warning')
    expect(input.delay).toBe(200)
    expect(input.position).toBe('top')
  })

  it('does not call eventTooltip.fn when indicator has no tooltip', () => {
    const container = makeContainer()
    const fn = vi.fn(() => () => {})
    const tooltipConfig: EventTooltipConfig<CalendarEvent> = { fn }
    renderIndicators(makeEvent([{ icon: '⚠' }]), container, tooltipConfig)
    expect(fn).not.toHaveBeenCalled()
  })
})
