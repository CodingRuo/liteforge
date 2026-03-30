import type { Point } from '../types.js'

/**
 * Cubic bezier path between two points.
 * Control points extend horizontally from source/target.
 * curvature: 0–1, default 0.25 (minimum offset clamped to 20px).
 */
export function getBezierPath(source: Point, target: Point, curvature = 0.25): string {
  const offset = Math.max(20, Math.abs(target.x - source.x) * curvature)
  const cp1x = source.x + offset
  const cp1y = source.y
  const cp2x = target.x - offset
  const cp2y = target.y
  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${target.x} ${target.y}`
}

/**
 * Orthogonal step path: horizontal to midpoint, vertical, horizontal to target.
 */
export function getStepPath(source: Point, target: Point): string {
  const midX = (source.x + target.x) / 2
  return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`
}

/**
 * Straight line from source to target.
 */
export function getStraightPath(source: Point, target: Point): string {
  return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
}
