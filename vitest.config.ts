import path from 'path'
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'modules/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        'lib/mcp/servers/**',
        'modules/core/components/**',
      ],
      thresholds: {
        lines: 5,
        functions: 5,
        branches: 5,
        statements: 5,
      },
    },
    pool: 'forks',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
