import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/** Integração contra o Supabase real, com identidades sintéticas que se apagam no fim. */
export default defineConfig({
  resolve: { alias: { '@': resolve(import.meta.dirname, 'src') } },
  test: { include: ['tests/integracao/**/*.test.ts'], environment: 'node', testTimeout: 60_000, hookTimeout: 120_000, fileParallelism: false },
})
