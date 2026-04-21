import { defineServerModule } from '@liteforge/server'
import { z } from 'zod'

export const greetingsModule = defineServerModule('greetings')
  .serverFn('hello', {
    input: z.object({ name: z.string().min(1, 'Name required') }),
    handler: async (input) => ({
      greeting: `Hello, ${input.name}! 👋`,
      timestamp: Date.now(),
      serverTime: new Date().toISOString(),
    }),
  }).serverFn('test', {
    input: z.object({ auto: z.string().min(1, "car required")} ),
    handler: async (input) => {

      return {
        data: input.auto
      }
    }
  })
  .build()
