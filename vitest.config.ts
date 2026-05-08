import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    global: 'globalThis',
  },
  poolOptions: {
    threads: {
      singleThread: true,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'examples/**', // Exclude example files from coverage
        '**/*.d.ts',
        'vitest.config.ts',
        'src/index.ts', // Barrel export file
        '**/index.ts', // All index barrel exports
      ],
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95
        }
      }
    }
  }
});
