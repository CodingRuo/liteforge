import type { Point, Transform } from '../types.js'

export function screenToCanvas(point: Point, transform: Transform): Point {
  return {
    x: (point.x - transform.x) / transform.scale,
    y: (point.y - transform.y) / transform.scale,
  }
}

export function canvasToScreen(point: Point, transform: Transform): Point {
  return {
    x: point.x * transform.scale + transform.x,
    y: point.y * transform.scale + transform.y,
  }
}
