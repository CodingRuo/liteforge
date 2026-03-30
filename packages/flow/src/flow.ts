import type { FlowOptions, FlowHandle } from './types.js'

export function createFlow(options: FlowOptions): FlowHandle {
  return { options: Object.freeze({ ...options }) }
}
