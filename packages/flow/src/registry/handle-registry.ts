import { signal } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type { Point, HandleType, FlowNode } from '../types.js'

export interface HandleEntry {
  offset: Point
  type:   HandleType
}

export interface HandleRegistry {
  register:            (nodeId: string, handleId: string, offset: Point, type: HandleType) => void
  unregister:          (nodeId: string, handleId: string) => void
  getEntry:            (nodeId: string, handleId: string) => HandleEntry | undefined
  getAbsolutePosition: (nodeId: string, handleId: string, nodes: FlowNode[]) => Point | undefined
  readonly version:    Signal<number>
}

export function createHandleRegistry(): HandleRegistry {
  // Map<nodeId, Map<handleId, HandleEntry>>
  const entries = new Map<string, Map<string, HandleEntry>>()
  const version = signal(0)

  return {
    get version() { return version },

    register(nodeId, handleId, offset, type) {
      let nodeHandles = entries.get(nodeId)
      if (!nodeHandles) {
        nodeHandles = new Map()
        entries.set(nodeId, nodeHandles)
      }
      nodeHandles.set(handleId, { offset, type })
      version.update(v => v + 1)
    },

    unregister(nodeId, handleId) {
      const nodeHandles = entries.get(nodeId)
      if (!nodeHandles) return
      nodeHandles.delete(handleId)
      if (nodeHandles.size === 0) {
        entries.delete(nodeId)
      }
      version.update(v => v + 1)
    },

    getEntry(nodeId, handleId) {
      return entries.get(nodeId)?.get(handleId)
    },

    getAbsolutePosition(nodeId, handleId, nodes) {
      const entry = entries.get(nodeId)?.get(handleId)
      if (!entry) return undefined
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return undefined
      return {
        x: node.position.x + entry.offset.x,
        y: node.position.y + entry.offset.y,
      }
    },
  }
}
