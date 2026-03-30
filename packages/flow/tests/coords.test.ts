import { describe, it, expect } from 'vitest'
import { screenToCanvas, canvasToScreen } from '../src/geometry/coords.js'
import type { Transform } from '../src/types.js'

describe('screenToCanvas', () => {
  it('converts with identity transform', () => {
    const t: Transform = { x: 0, y: 0, scale: 1 }
    expect(screenToCanvas({ x: 100, y: 200 }, t)).toEqual({ x: 100, y: 200 })
  })

  it('accounts for pan offset', () => {
    const t: Transform = { x: 50, y: 30, scale: 1 }
    expect(screenToCanvas({ x: 100, y: 80 }, t)).toEqual({ x: 50, y: 50 })
  })

  it('accounts for scale', () => {
    const t: Transform = { x: 0, y: 0, scale: 2 }
    expect(screenToCanvas({ x: 100, y: 200 }, t)).toEqual({ x: 50, y: 100 })
  })

  it('round-trips with canvasToScreen', () => {
    const t: Transform = { x: 100, y: 50, scale: 1.5 }
    const screen = { x: 300, y: 200 }
    const canvas = screenToCanvas(screen, t)
    const back = canvasToScreen(canvas, t)
    expect(back.x).toBeCloseTo(screen.x)
    expect(back.y).toBeCloseTo(screen.y)
  })
})

describe('canvasToScreen', () => {
  it('converts with identity transform', () => {
    const t: Transform = { x: 0, y: 0, scale: 1 }
    expect(canvasToScreen({ x: 100, y: 200 }, t)).toEqual({ x: 100, y: 200 })
  })

  it('applies scale and offset', () => {
    const t: Transform = { x: 10, y: 20, scale: 2 }
    expect(canvasToScreen({ x: 50, y: 30 }, t)).toEqual({ x: 110, y: 80 })
  })
})
